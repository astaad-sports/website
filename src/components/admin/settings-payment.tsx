import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import type { RazorpayStatus } from "@/lib/payments/razorpay";
import { cn } from "@/lib/utils";

const DASHBOARD_URL = "https://dashboard.razorpay.com";

/** "CONNECTED" or "NOT CONNECTED" with a dot, like the order status labels. The word carries the meaning. */
export function ConnectionLabel({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] leading-[14px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase",
        connected ? "text-success" : "text-danger"
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", connected ? "bg-success" : "bg-danger")} />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

/** A grey line under a service's name. */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[13px] leading-[18px] text-ink-muted", className)}>{children}</p>;
}

/** An environment variable's name, set apart so it can be copied exactly. */
export function EnvName({ children }: { children: string }) {
  return <code className="font-mono text-xs font-semibold break-all text-foreground">{children}</code>;
}

/** "Open Razorpay dashboard": a link out to the service, in a new tab. */
export function DashboardLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm leading-5 font-semibold transition-colors hover:text-ink-muted"
    >
      {children}
      <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/**
 * Whether customers can pay. Razorpay's keys are server settings, not
 * something to type into the admin, so this only reports them and names
 * whatever is missing.
 */
export function RazorpaySettings({ status }: { status: RazorpayStatus }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-[15px] leading-[22px] font-semibold">Razorpay</span>
        <ConnectionLabel connected={status.connected} />
      </div>
      {status.connected ? (
        <>
          {status.mode && (
            <Note className="font-semibold text-foreground">
              {status.mode === "live" ? "Live mode" : "Test mode — no real money moves"}
            </Note>
          )}
          <Note>Customers pay online before the order is placed.</Note>
          {!status.webhook && (
            <Note>
              Without <EnvName>RAZORPAY_WEBHOOK_SECRET</EnvName>, a payment is only confirmed if the customer stays on
              the page until it finishes.
            </Note>
          )}
        </>
      ) : (
        <Note>
          Customers can&apos;t pay until <EnvName>RAZORPAY_KEY_ID</EnvName> and <EnvName>RAZORPAY_KEY_SECRET</EnvName> are
          set in the site&apos;s environment variables.
        </Note>
      )}
      <DashboardLink href={DASHBOARD_URL}>Open Razorpay dashboard</DashboardLink>
      {status.connected && <MagicCheckoutSettings magic={status.magic} webhook={status.webhook} />}
    </div>
  );
}

/**
 * Razorpay Magic Checkout: whether Buy now opens Razorpay's own window, and
 * the three addresses Razorpay's dashboard asks for, to copy from here.
 */
function MagicCheckoutSettings({ magic, webhook }: { magic: RazorpayStatus["magic"]; webhook: boolean }) {
  const urls: [string, string][] = [
    ["Shipping info URL", magic.shippingInfoUrl],
    ["URL for get promotions", magic.getPromotionsUrl],
    ["URL for apply promotions", magic.applyPromotionsUrl],
  ];
  return (
    <div className="mt-2 flex flex-col gap-1 border-t border-border pt-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-[15px] leading-[22px] font-semibold">Magic Checkout</span>
        <span className="text-[11px] leading-[14px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
          {magic.on ? "On" : "Off"}
        </span>
      </div>
      <Note>
        {magic.on
          ? "Buy now opens Razorpay’s window, which takes the mobile number, address, coupon and payment."
          : "Buy now opens the store’s own checkout. Once Razorpay has enabled Magic Checkout for the account, enter the addresses below in the Razorpay dashboard (Magic Checkout, as a custom e-commerce platform), then set the variable to “on” and redeploy."}
      </Note>
      {!magic.on && (
        <Note>
          <EnvName>NEXT_PUBLIC_MAGIC_CHECKOUT</EnvName>
        </Note>
      )}
      {magic.on && !webhook && (
        <Note>
          Set <EnvName>RAZORPAY_WEBHOOK_SECRET</EnvName> too: without it, a Magic Checkout order is made only if the
          customer stays on the page until the payment finishes.
        </Note>
      )}
      <dl className="mt-1 flex flex-col gap-2">
        {urls.map(([label, url]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-[13px] leading-[18px] text-ink-muted">{label}</dt>
            <dd className="font-mono text-xs leading-[18px] break-all select-all">{url}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
