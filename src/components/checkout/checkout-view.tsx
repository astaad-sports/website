"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";

import { trackEvent } from "@/components/analytics/track";
import { EmptyCart } from "@/components/cart/cart-view";
import { CouponStatus, useCouponRecheck } from "@/components/cart/coupon-box";
import { lineOfferText, RegularPrice } from "@/components/cart/line-offer";
import { OrderSummary } from "@/components/cart/order-summary";
import { useCart } from "@/components/cart/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addressSummary, type SavedAddress } from "@/lib/addresses/model";
import { cartEvent } from "@/lib/analytics-events";
import { lineProblemText } from "@/lib/cart";
import { ADDRESS_FIELDS, INDIAN_STATES, type CheckoutField, type ShippingAddress } from "@/lib/checkout";
import { formatOrderNumber, formatPaise } from "@/lib/format";
import { confirmPayment, placeOrder, type CheckoutPayment } from "@/lib/orders/actions";
import { cn } from "@/lib/utils";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

type Stage = "form" | "confirming" | "confirmed";

/** The address fields, marked as the shipping address for the browser's autofill. */
const FIELDS = ADDRESS_FIELDS.map((field) => ({ ...field, autoComplete: `shipping ${field.autoComplete}` }));

/**
 * The checkout page body: the delivery address beside the order and the Pay
 * button. Paying places the order on the server, opens Razorpay Checkout,
 * then confirms the payment and opens the order. The page hands down a
 * catalogue read fresh from the database and the coupon is checked again, so
 * the total shown is the total placeOrder charges. The form starts on the
 * customer's default saved address; choosing another of theirs fills it in.
 * A `guest` has no account: they give an email for the order instead. With
 * `buyNow` the order is the one product "Buy it now" chose, and the cart is
 * left as it is.
 */
export function CheckoutView({
  buyNow,
  guest,
  signInHref,
  email,
  defaults,
  addresses,
  paymentsReady,
  testAccount,
  storeName,
}: {
  buyNow: boolean;
  guest: boolean;
  /** Sign in, then come back to this checkout. */
  signInHref: string;
  /** The account's email. */
  email: string | null;
  /** What the form starts with when the customer has no saved address. */
  defaults: Partial<ShippingAddress>;
  /** The customer's saved addresses, their default first. */
  addresses: SavedAddress[];
  paymentsReady: boolean;
  /** A test account: Razorpay opens in test mode and the order is a test order. */
  testAccount: boolean;
  /** Settings' store name, shown in the Razorpay window. */
  storeName: string;
}) {
  const id = useId();
  const router = useRouter();
  const { items, priced, coupon, setCoupon, clear } = useCart(buyNow ? "buy-now" : "cart");
  const payRef = useRef<HTMLButtonElement>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [pending, startTransition] = useTransition();
  // The saved address the form was last filled from, how many times it has
  // been filled (each one starts the fields afresh), and whether the customer
  // has typed over it since.
  const [filled, setFilled] = useState<{ from: SavedAddress | null; times: number; edited: boolean }>(() => ({
    from: addresses.find((address) => address.isDefault) ?? addresses[0] ?? null,
    times: 0,
    edited: false,
  }));
  const starting: Partial<ShippingAddress> = filled.from ?? defaults;
  const recheckCoupon = useCouponRecheck(setError);
  // A placed order is reused while the cart, address and total are unchanged
  // (say the payment window failed to load). Closing the window forgets it,
  // so paying later places the order again against current stock and prices.
  const placed = useRef<{ fingerprint: string; payment: CheckoutPayment } | null>(null);

  // Google Analytics: a checkout begun, once per visit to this page, as soon as the cart is known.
  const began = useRef(false);
  useEffect(() => {
    if (began.current || !priced || priced.lines.length === 0) return;
    began.current = true;
    trackEvent("begin_checkout", {
      ...cartEvent(priced.lines),
      ...(priced.coupon?.applied ? { coupon: priced.coupon.code } : {}),
    });
  }, [priced]);

  // "Buy it now" with nothing chosen in this browser (its order is paid, or
  // the address was opened somewhere else): the cart instead.
  const nothingToBuy = buyNow && stage === "form" && priced?.lines.length === 0;
  useEffect(() => {
    if (nothingToBuy) router.replace("/cart");
  }, [nothingToBuy, router]);

  if (stage !== "form") {
    return (
      <div role="status" className="rounded-md border border-border bg-surface-raised p-8 shadow-card">
        <p className="type-heading-md">
          {stage === "confirming" ? "Confirming your payment…" : "Payment received. Opening your order…"}
        </p>
      </div>
    );
  }
  if (!priced || !items || nothingToBuy) {
    return <div aria-busy="true" aria-label="Loading your cart" className="h-[420px] animate-pulse rounded-md bg-surface-raised" />;
  }
  if (priced.lines.length === 0) return <EmptyCart />;

  function openRazorpay(payment: CheckoutPayment) {
    if (!window.Razorpay) {
      setError("The payment window did not load. Check your connection and try again.");
      return;
    }
    const checkout = new window.Razorpay({
      key: payment.keyId,
      order_id: payment.razorpayOrderId,
      amount: payment.amountPaise,
      currency: "INR",
      name: storeName,
      description: `Order ${formatOrderNumber(payment.orderNumber)}`,
      image: `${window.location.origin}/brand/astaad-crest.png`,
      prefill: payment.prefill,
      notes: { order_number: String(payment.orderNumber) },
      theme: { color: "#fec502" },
      modal: {
        // Closed without paying: the next Pay places the order again, checking current stock and prices.
        ondismiss: () => {
          placed.current = null;
        },
      },
      handler: (response: RazorpaySuccess) => {
        setStage("confirming");
        startTransition(async () => {
          const result = await confirmPayment(response);
          if (!result.ok) {
            setStage("form");
            setError(result.error);
            return;
          }
          setStage("confirmed");
          placed.current = null;
          router.replace(`${result.orderPath}?placed=1`);
          clear();
        });
      },
    });
    checkout.on("payment.failed", (response) => {
      setError(
        `${response.error?.description ?? "The payment did not go through."} You have not been charged. Try again or use another method.`
      );
    });
    checkout.open();
  }

  function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items || !priced) return;
    const shownTotal = priced.totalPaise;
    const form = new FormData(event.currentTarget);
    const address = Object.fromEntries(
      [...FIELDS.map((field) => field.name), "state"].map((name) => [name, String(form.get(name) ?? "")])
    );
    const saveAddress = form.get("saveAddress") === "on";
    // A guest's order goes by the email they type; an account's by its own.
    const guestEmail = guest ? String(form.get("email") ?? "") : undefined;
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const couponCode = coupon?.code;
      const fingerprint = JSON.stringify({ items, address, guestEmail, shownTotal, couponCode });
      let payment = placed.current?.fingerprint === fingerprint ? placed.current.payment : null;
      if (!payment) {
        const result = await placeOrder({
          items,
          address,
          email: guestEmail,
          expectedTotalPaise: shownTotal,
          couponCode,
          saveAddress,
        });
        if (!result.ok) {
          setError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          // Stock, prices or the coupon's offer may have changed: load the
          // current catalogue and coupon so the order shows what to fix.
          router.refresh();
          if (!result.fieldErrors) void recheckCoupon();
          return;
        }
        payment = result.payment;
        placed.current = { fingerprint, payment };
      }
      openRazorpay(payment);
    });
  }

  // The Pay button now shows the new total, so focus moves there.
  function removeCoupon() {
    setCoupon(null);
    payRef.current?.focus();
  }

  const errorId = (name: CheckoutField) => `${id}-${name}-error`;
  // "Buy it now" has one line: the product it was chosen on.
  const productHref = buyNow ? priced.lines[0].href : null;

  return (
    <>
      <Script src={CHECKOUT_SCRIPT} strategy="afterInteractive" />
      <form
        onSubmit={pay}
        noValidate
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"
        aria-busy={pending}
      >
        <section
          aria-labelledby={`${id}-address`}
          className="flex flex-col gap-6 rounded-md border border-border bg-surface-raised p-6 shadow-card md:p-8"
        >
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-address`} className="type-heading-md">
              Delivery address
            </h2>
            {guest ? (
              <p className="type-body-sm text-ink-muted">
                Checking out as a guest. Have an account?{" "}
                <Link href={signInHref} className="font-semibold text-foreground underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            ) : (
              email && <p className="type-body-sm text-ink-muted">Signed in as {email}</p>
            )}
          </div>

          {guest && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-email`}>Email</Label>
              <Input
                id={`${id}-email`}
                name="email"
                type="email"
                inputMode="email"
                maxLength={254}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? errorId("email") : `${id}-email-help`}
              />
              {fieldErrors.email ? (
                <p id={errorId("email")} className="type-body-sm text-danger">
                  {fieldErrors.email}
                </p>
              ) : (
                <p id={`${id}-email-help`} className="type-body-sm text-ink-muted">
                  Your order confirmation and delivery updates go here.
                </p>
              )}
            </div>
          )}

          {addresses.length > 0 && (
            <div role="group" aria-labelledby={`${id}-saved`} className="flex flex-col gap-3">
              <p id={`${id}-saved`} className="type-body-sm font-semibold">
                Your saved addresses
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {addresses.map((address) => (
                  <li key={address.id} className="flex">
                    <button
                      type="button"
                      aria-pressed={filled.from?.id === address.id && !filled.edited}
                      onClick={() => {
                        setFilled((current) => ({ from: address, times: current.times + 1, edited: false }));
                        setFieldErrors({});
                      }}
                      className="flex min-h-11 w-full cursor-pointer flex-col items-start gap-0.5 rounded-md border border-border p-4 text-left transition-colors hover:border-border-strong aria-pressed:border-foreground aria-pressed:bg-surface-sunken"
                    >
                      <span className="type-body-sm font-semibold">
                        {addressSummary(address)}
                        {address.isDefault && <span className="font-normal text-ink-muted"> · Default</span>}
                      </span>
                      {/* An address with no name of its own goes by the person's, so it is not said twice. */}
                      <span className="type-body-sm text-ink-muted">
                        {address.label ? `${address.name}, ${address.line1}` : address.line1}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="type-body-sm text-ink-muted">Choose one to fill in the form, or type another address below.</p>
            </div>
          )}

          {/* Filled afresh each time a saved address is chosen; typing over it takes the mark off the address. */}
          <div
            key={filled.times}
            onChange={() => setFilled((current) => (current.edited ? current : { ...current, edited: true }))}
            className="grid gap-5 sm:grid-cols-2"
          >
            {FIELDS.map((field) => (
              <div key={field.name} className={cn("flex flex-col gap-2", field.span && "sm:col-span-2")}>
                <Label htmlFor={`${id}-${field.name}`}>
                  {field.label}
                  {field.optional && <span className="font-normal text-ink-muted">(optional)</span>}
                </Label>
                <Input
                  id={`${id}-${field.name}`}
                  name={field.name}
                  type={field.type ?? "text"}
                  inputMode={field.inputMode}
                  maxLength={field.maxLength}
                  autoComplete={field.autoComplete}
                  defaultValue={starting[field.name] ?? ""}
                  required={!field.optional}
                  aria-invalid={fieldErrors[field.name] ? true : undefined}
                  aria-describedby={fieldErrors[field.name] ? errorId(field.name) : undefined}
                />
                {fieldErrors[field.name] && (
                  <p id={errorId(field.name)} className="type-body-sm text-danger">
                    {fieldErrors[field.name]}
                  </p>
                )}
              </div>
            ))}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor={`${id}-state`}>State</Label>
              <select
                id={`${id}-state`}
                name="state"
                autoComplete="shipping address-level1"
                defaultValue={starting.state ?? ""}
                required
                aria-invalid={fieldErrors.state ? true : undefined}
                aria-describedby={fieldErrors.state ? errorId("state") : undefined}
                className="h-11 w-full rounded-md border border-input bg-surface-raised px-4 text-[15px] leading-[22px] text-foreground aria-invalid:border-danger"
              >
                <option value="" disabled>
                  Choose a state
                </option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {fieldErrors.state && (
                <p id={errorId("state")} className="type-body-sm text-danger">
                  {fieldErrors.state}
                </p>
              )}
            </div>
          </div>

          {/* An address already on the account is not saved twice. A guest has no account to keep it on. */}
          {!guest && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 self-start type-body">
              <input type="checkbox" name="saveAddress" defaultChecked className="size-5 shrink-0 accent-foreground" />
              Save this address to my account
            </label>
          )}
        </section>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <section
            aria-labelledby={`${id}-items`}
            className="flex flex-col gap-4 rounded-md border border-border bg-surface-raised p-6 shadow-card"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 id={`${id}-items`} className="type-heading-md">
                Your order
              </h2>
              <Link href={productHref ?? "/cart"} className="type-body-sm font-semibold underline underline-offset-4">
                {productHref ? "Back to product" : "Edit cart"}
              </Link>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {priced.lines.map((line) => (
                <li key={line.key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-surface-sunken">
                    <Image src={line.image} alt="" fill sizes="56px" className="object-contain p-1" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm leading-5 font-semibold">{line.name}</span>
                    {line.summary && <span className="type-body-sm text-ink-muted">{line.summary}</span>}
                    <span className="type-body-sm text-ink-muted">Qty {line.item.quantity}</span>
                    {line.offer && <span className="type-body-sm font-semibold">{lineOfferText(line.offer)}</span>}
                    {line.problem && (
                      <span className="type-body-sm font-semibold text-danger">
                        {/* The cart's words say how to fix the cart; "Buy it now" has none to fix. */}
                        {buyNow ? "Out of stock." : lineProblemText(line)}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-sm leading-5 font-semibold tabular-nums">
                      {formatPaise(line.lineTotalPaise)}
                    </span>
                    {line.unitPricePaise < line.regularUnitPricePaise && (
                      <RegularPrice paise={line.regularUnitPricePaise * line.item.quantity} />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <OrderSummary
            count={priced.count}
            subtotalPaise={priced.subtotalPaise}
            discountPaise={priced.discountPaise}
            shippingPaise={priced.shippingPaise}
            totalPaise={priced.totalPaise}
          >
            {coupon && (
              <div className="border-t border-border pt-5">
                <CouponStatus
                  coupon={coupon}
                  applied={priced.coupon?.applied ?? false}
                  covered={priced.coupon?.covered ?? false}
                  onRemove={removeCoupon}
                />
              </div>
            )}
            {testAccount && (
              <p className="rounded-sm bg-surface-sunken p-3 type-body-sm">
                <span className="font-semibold">Test account.</span> This is a test order: Razorpay opens in test
                mode, so pay with the UPI ID <span className="font-semibold">success@razorpay</span>. No money is
                taken, no stock is used and nothing ships.
              </p>
            )}
            {!paymentsReady && (
              <p className="type-body-sm text-ink-muted">
                {testAccount
                  ? "Test payments need Razorpay test keys, so test orders cannot be placed yet."
                  : "Online payment is not set up yet, so orders cannot be placed."}
              </p>
            )}
            {priced.unavailable > 0 &&
              (productHref ? (
                <p className="type-body-sm font-semibold text-danger">
                  This is out of stock right now.{" "}
                  <Link href={productHref} className="underline underline-offset-4">
                    Back to product
                  </Link>
                </p>
              ) : (
                <p className="type-body-sm font-semibold text-danger">
                  Some items can&apos;t be bought right now.{" "}
                  <Link href="/cart" className="underline underline-offset-4">
                    Update your cart
                  </Link>{" "}
                  to continue.
                </p>
              ))}
            {error && (
              <p role="alert" className="type-body-sm text-danger">
                {error}
              </p>
            )}
            <Button
              ref={payRef}
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending || !paymentsReady || priced.unavailable > 0}
            >
              {pending ? "Please wait…" : `Pay ${formatPaise(priced.totalPaise)}`}
            </Button>
            <p className="type-body-sm text-center text-ink-muted">
              By paying, you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-4">
                terms of service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                privacy policy
              </Link>
              .
            </p>
          </OrderSummary>
        </div>
      </form>
    </>
  );
}
