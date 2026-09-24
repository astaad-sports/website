"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition, type FormEvent, type Ref } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { couponTerms, normaliseCode, offerStatus, type AppliedCoupon } from "@/lib/offers/model";
import { checkCoupon, type CheckCouponResult } from "@/lib/orders/actions";

import { useCart } from "./use-cart";

const FAILED = "Something went wrong. Try again.";

/**
 * Checks the stored coupon with the server again: once the cart has loaded,
 * and whenever the returned function is called. The admin may have changed
 * or ended its offer since the customer applied it, and placeOrder prices
 * the code as it is now, so a stale copy would show the wrong total and fail
 * every Pay with "Prices changed". The server's terms replace the stored
 * ones; a code that no longer works is removed and `onRemoved` says why.
 */
export function useCouponRecheck(onRemoved: (message: string) => void): () => Promise<void> {
  const { priced, coupon, setCoupon } = useCart();
  const latest = useRef(coupon);
  useEffect(() => {
    latest.current = coupon;
  });

  const recheck = useCallback(async () => {
    const stored = latest.current;
    if (!stored) return;
    let result: CheckCouponResult;
    try {
      result = await checkCoupon(stored.code);
    } catch {
      return; // placeOrder checks the code again anyway.
    }
    // The customer applied or removed a coupon meanwhile: theirs stands.
    if (latest.current !== stored) return;
    if (!result.ok) {
      setCoupon(null);
      onRemoved(`${stored.code} was removed. ${result.error}`);
    } else if (JSON.stringify(result.coupon) !== JSON.stringify(stored)) {
      setCoupon(result.coupon);
    }
  }, [setCoupon, onRemoved]);

  // Once per page: `priced` is null until the stored cart has loaded.
  const loaded = priced !== null;
  const checked = useRef(false);
  useEffect(() => {
    if (!loaded || checked.current) return;
    checked.current = true;
    void recheck();
  }, [loaded, recheck]);

  return recheck;
}

/**
 * The coupon the customer entered: "DIWALI20 applied · Diwali Sale", or why
 * it takes nothing off this cart, with Remove. `applied` and `covered` are
 * PricedCart's coupon.applied and coupon.covered. The checkout shows it too.
 */
export function CouponStatus({
  coupon,
  applied,
  covered,
  onRemove,
  removeRef,
}: {
  coupon: AppliedCoupon;
  applied: boolean;
  /** The code covers something in the cart, but an offer already on it takes more off. */
  covered: boolean;
  onRemove: () => void;
  removeRef?: Ref<HTMLButtonElement>;
}) {
  const id = useId();
  const expired = offerStatus(couponTerms(coupon)) === "expired";
  return (
    <div className="flex items-center justify-between gap-3">
      <p id={id} role="status" className="flex min-w-0 flex-col gap-0.5 type-body-sm">
        {applied ? (
          <span>
            <span className="font-semibold">{coupon.code} applied</span> · {coupon.name}
          </span>
        ) : (
          <>
            <span className="font-semibold">{coupon.code}</span>
            {/* An expired code stops the order being placed, so it reads as an error. */}
            <span className={expired ? "text-danger" : "text-ink-muted"}>
              {expired
                ? "This code has expired."
                : covered
                  ? "Your cart already has a better offer."
                  : "This code doesn't apply to anything in your cart."}
            </span>
          </>
        )}
      </p>
      <Button
        ref={removeRef}
        type="button"
        variant="link"
        aria-label={`Remove coupon ${coupon.code}`}
        aria-describedby={id}
        onClick={onRemove}
        className="min-w-11 px-0"
      >
        Remove
      </Button>
    </div>
  );
}

/**
 * The cart's coupon box: a code field and Apply, checked on the server, then
 * the coupon's status with Remove. Focus follows the change: to Remove once a
 * code is applied, back to the field once it is removed. A stored code that
 * no longer works is removed when the cart opens, with the reason under the
 * field.
 */
export function CouponBox() {
  const id = useId();
  const { coupon, priced, setCoupon } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useCouponRecheck(setError);
  const inputRef = useRef<HTMLInputElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<"input" | "remove" | null>(null);

  // Runs once the field or Remove has rendered in place of the other.
  useEffect(() => {
    const target = focusNext.current === "remove" ? removeRef.current : focusNext.current === "input" ? inputRef.current : null;
    focusNext.current = null;
    target?.focus();
  }, [coupon]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normaliseCode(code)) {
      setError("Enter a coupon code.");
      inputRef.current?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      let result: CheckCouponResult;
      try {
        result = await checkCoupon(code);
      } catch {
        result = { ok: false, error: FAILED };
      }
      if (!result.ok) {
        setError(result.error);
        inputRef.current?.focus();
        return;
      }
      focusNext.current = "remove";
      setCode("");
      setCoupon(result.coupon);
    });
  }

  function remove() {
    focusNext.current = "input";
    setCoupon(null);
  }

  const errorId = `${id}-error`;

  return (
    <div className="border-t border-border pt-5">
      {coupon ? (
        <CouponStatus
          coupon={coupon}
          applied={priced?.coupon?.applied ?? false}
          covered={priced?.coupon?.covered ?? false}
          onRemove={remove}
          removeRef={removeRef}
        />
      ) : (
        <form onSubmit={apply} noValidate aria-busy={pending} className="flex flex-col gap-2">
          <Label htmlFor={`${id}-code`}>Coupon code</Label>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              id={`${id}-code`}
              name="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={30}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="flex-1 uppercase"
            />
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? "Applying…" : "Apply"}
            </Button>
          </div>
          {error && (
            <p id={errorId} role="alert" className="type-body-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
