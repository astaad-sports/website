"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";

import { EmptyCart } from "@/components/cart/cart-view";
import { CouponStatus, useCouponRecheck } from "@/components/cart/coupon-box";
import { lineOfferText, RegularPrice } from "@/components/cart/line-offer";
import { OrderSummary } from "@/components/cart/order-summary";
import { useCart } from "@/components/cart/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lineProblemText } from "@/lib/cart";
import { INDIAN_STATES, type AddressField, type ShippingAddress } from "@/lib/checkout";
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

const FIELDS: {
  name: AddressField;
  label: string;
  autoComplete: string;
  optional?: boolean;
  type?: string;
  inputMode?: "numeric" | "tel";
  maxLength?: number;
  span?: boolean;
}[] = [
  { name: "name", label: "Full name", autoComplete: "shipping name", span: true },
  { name: "phone", label: "Mobile number", autoComplete: "shipping tel-national", type: "tel", inputMode: "tel", span: true },
  { name: "line1", label: "House number, building and street", autoComplete: "shipping address-line1", span: true },
  { name: "line2", label: "Area and landmark", autoComplete: "shipping address-line2", optional: true, span: true },
  { name: "city", label: "Town or city", autoComplete: "shipping address-level2" },
  { name: "pincode", label: "PIN code", autoComplete: "shipping postal-code", inputMode: "numeric", maxLength: 6 },
];

/**
 * The checkout page body: the delivery address beside the order and the Pay
 * button. Paying places the order on the server, opens Razorpay Checkout,
 * then confirms the payment and opens the order. The page hands down a
 * catalogue read fresh from the database and the coupon is checked again, so
 * the total shown is the total placeOrder charges.
 */
export function CheckoutView({
  email,
  defaults,
  paymentsReady,
  testAccount,
  storeName,
}: {
  email: string | null;
  defaults: Partial<ShippingAddress>;
  paymentsReady: boolean;
  /** A test account: Razorpay opens in test mode and the order is a test order. */
  testAccount: boolean;
  /** Settings' store name, shown in the Razorpay window. */
  storeName: string;
}) {
  const id = useId();
  const router = useRouter();
  const { items, priced, coupon, setCoupon, clear } = useCart();
  const payRef = useRef<HTMLButtonElement>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AddressField, string>>>({});
  const [pending, startTransition] = useTransition();
  const recheckCoupon = useCouponRecheck(setError);
  // A placed order is reused while the cart, address and total are unchanged
  // (say the payment window failed to load). Closing the window forgets it,
  // so paying later places the order again against current stock and prices.
  const placed = useRef<{ fingerprint: string; payment: CheckoutPayment } | null>(null);

  if (stage !== "form") {
    return (
      <div role="status" className="rounded-md border border-border bg-surface-raised p-8 shadow-card">
        <p className="type-heading-md">
          {stage === "confirming" ? "Confirming your payment…" : "Payment received. Opening your order…"}
        </p>
      </div>
    );
  }
  if (!priced || !items) {
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
          router.replace(`/account/orders/${result.orderNumber}?placed=1`);
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
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const couponCode = coupon?.code;
      const fingerprint = JSON.stringify({ items, address, shownTotal, couponCode });
      let payment = placed.current?.fingerprint === fingerprint ? placed.current.payment : null;
      if (!payment) {
        const result = await placeOrder({ items, address, expectedTotalPaise: shownTotal, couponCode });
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

  const errorId = (name: AddressField) => `${id}-${name}-error`;

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
            {email && <p className="type-body-sm text-ink-muted">Signed in as {email}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
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
                  defaultValue={defaults[field.name] ?? ""}
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
                defaultValue={defaults.state ?? ""}
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
              <Link href="/cart" className="type-body-sm font-semibold underline underline-offset-4">
                Edit cart
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
                      <span className="type-body-sm font-semibold text-danger">{lineProblemText(line)}</span>
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
            {priced.unavailable > 0 && (
              <p className="type-body-sm font-semibold text-danger">
                Some items can&apos;t be bought right now.{" "}
                <Link href="/cart" className="underline underline-offset-4">
                  Update your cart
                </Link>{" "}
                to continue.
              </p>
            )}
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
