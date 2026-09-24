import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import type { RazorpayStatus } from "@/lib/payments/razorpay";
import { cn } from "@/lib/utils";

const DASHBOARD_URL = "https://dashboard.razorpay.com";

/** "CONNECTED" or "NOT CONNECTED" with a dot, like the order status labels. The word carries the meaning. */
function ConnectionLabel({ connected }: { connected: boolean }) {
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

function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[13px] leading-[18px] text-ink-muted", className)}>{children}</p>;
}

/** An environment variable's name, set apart so it can be copied exactly. */
function EnvName({ children }: { children: string }) {
  return <code className="font-mono text-xs font-semibold break-all text-foreground">{children}</code>;
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
      <a
        href={DASHBOARD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm leading-5 font-semibold transition-colors hover:text-ink-muted"
      >
        Open Razorpay dashboard
        <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}
