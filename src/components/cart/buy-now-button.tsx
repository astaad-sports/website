"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { trackEvent } from "@/components/analytics/track";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cartEvent } from "@/lib/analytics-events";
import { priceCartItem, type CartItem } from "@/lib/cart";
import { BUY_NOW_CHECKOUT } from "@/lib/checkout";
import { confirmMagicPayment, startMagicCheckout } from "@/lib/orders/magic-actions";
import { MAGIC_CHECKOUT_SCRIPT, magicCheckoutEnabled } from "@/lib/payments/magic";
import { cn } from "@/lib/utils";

import { useCatalogue } from "./catalogue-provider";
import { useCart } from "./use-cart";

/** The solid button beside the yellow Add to cart: black on a light page, white on a dark panel. */
const TONE = {
  light: "border-surface-dark bg-surface-dark text-on-dark hover:border-surface-dark-raised hover:bg-surface-dark-raised",
  dark: "border-on-dark bg-on-dark text-surface-dark hover:border-on-dark-muted hover:bg-on-dark-muted",
};

/** Set when the site is built: whether Buy now opens Razorpay's Magic Checkout window (see magic.ts). */
const MAGIC = magicCheckoutEnabled();

interface PaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

let magicScript: Promise<void> | undefined;

/** Razorpay's Magic Checkout script, loaded on the first Buy now. A load that fails can be tried again. */
function loadMagicScript(): Promise<void> {
  magicScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MAGIC_CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      magicScript = undefined;
      script.remove();
      reject(new Error("Razorpay's Magic Checkout script did not load"));
    };
    document.head.appendChild(script);
  });
  return magicScript;
}

export type BuyNowButtonProps = Omit<ButtonProps, "onClick" | "children" | "variant"> & {
  item: CartItem;
  /**
   * The product is out of stock: there is no button, as the Add to cart
   * beside it already reads "Out of stock".
   */
  soldOut?: boolean;
  /** The surface the button sits on. */
  tone?: keyof typeof TONE;
  children: ReactNode;
};

/**
 * "Buy now": buys `item` alone, one of it, without adding it to the cart.
 * Whatever is in the cart stays there for later. It opens the store's
 * checkout for the item; or, with Magic Checkout switched on, Razorpay's own
 * window, which takes the mobile number, address, coupon and payment, and
 * then the paid order. If that window cannot be opened, the store's checkout
 * opens instead.
 */
export function BuyNowButton({ item, soldOut = false, tone = "light", children, className, ...props }: BuyNowButtonProps) {
  const { buyNow, coupon, setCoupon } = useCart();
  const catalogue = useCatalogue();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Razorpay's window is opening or open, or its payment is being confirmed.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (soldOut) return null;

  function openCheckoutPage() {
    buyNow(item);
    startTransition(() => router.push(BUY_NOW_CHECKOUT));
  }

  async function confirm(response: PaymentResponse) {
    const result = await confirmMagicPayment(response).catch(() => null);
    if (!result?.ok) {
      setBusy(false);
      setError(
        result?.error ??
          `Your payment went through, but we could not open your order. It will be confirmed shortly. If money left your account, contact us with payment ID ${response.razorpay_payment_id}.`
      );
      return;
    }
    // A coupon from the cart that this order used is done with, as after any order.
    if (result.couponCode && coupon?.code === result.couponCode) setCoupon(null);
    router.push(`${result.orderPath}?placed=1`);
  }

  async function openMagicCheckout() {
    setBusy(true);
    setError(null);
    try {
      const [started] = await Promise.all([startMagicCheckout({ items: [item] }), loadMagicScript()]);
      if (!started.ok || !window.Razorpay) {
        setBusy(false);
        openCheckoutPage();
        return;
      }
      const line = priceCartItem(item, catalogue);
      if (line) trackEvent("begin_checkout", cartEvent([line]));
      const { keyId, razorpayOrderId, storeName, prefill } = started.checkout;
      new window.Razorpay({
        key: keyId,
        one_click_checkout: true,
        order_id: razorpayOrderId,
        name: storeName,
        image: `${window.location.origin}/brand/astaad-crest.png`,
        show_coupons: true,
        // A coupon already entered in the cart is tried as the window opens.
        prefill: { ...prefill, ...(coupon ? { coupon_code: coupon.code } : {}) },
        theme: { color: "#fec502" },
        modal: { ondismiss: () => setBusy(false) },
        handler: (response: PaymentResponse) => void confirm(response),
      }).open();
    } catch {
      setBusy(false);
      openCheckoutPage();
    }
  }

  const waiting = pending || busy;

  return (
    <>
      <Button
        {...props}
        variant="secondary"
        disabled={waiting}
        focusableWhenDisabled
        aria-busy={waiting}
        onClick={() => (MAGIC ? void openMagicCheckout() : openCheckoutPage())}
        className={cn(TONE[tone], className)}
      >
        {waiting ? "Please wait…" : children}
      </Button>
      {error && (
        <p role="alert" className={cn("col-span-full type-body-sm", tone === "dark" ? "text-on-dark" : "text-danger")}>
          {error}
        </p>
      )}
    </>
  );
}
