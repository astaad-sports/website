import type { EmailStatus } from "@/lib/email/config";

import { ConnectionLabel, DashboardLink, EnvName, Note } from "./settings-payment";

const DASHBOARD_URL = "https://resend.com/emails";

/**
 * Whether order emails go out through Resend. Like Razorpay's keys, the API
 * key and sender are server settings rather than something to type into the
 * admin, so this only reports them and names whatever is missing.
 */
export function EmailSettings({ status }: { status: EmailStatus }) {
  const alerts = status.adminRecipients;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-[15px] leading-[22px] font-semibold">Order emails</span>
        <ConnectionLabel connected={status.connected} />
      </div>
      {status.connected ? (
        <>
          {status.usingTestSender ? (
            <>
              <Note className="font-semibold text-foreground">
                Test sender — emails only reach the Resend account&apos;s own address
              </Note>
              <Note>
                To email customers, verify the store&apos;s domain in Resend and set <EnvName>EMAIL_FROM</EnvName> to an
                address on it.
              </Note>
            </>
          ) : (
            <Note>
              Sent from <span className="font-semibold break-all text-foreground">{status.sender}</span>.
            </Note>
          )}
          <Note>
            Customers are emailed when they pay, and when their order is packed, ships, is delivered, is cancelled
            or is refunded.
          </Note>
          <Note>
            {alerts > 0 ? (
              <>
                Alerts for new orders, unpaid orders and new reviews, and a copy of each later email to the
                customer, go to {alerts === 1 ? "the address" : `the ${alerts} addresses`} in{" "}
                <EnvName>ADMIN_EMAILS</EnvName>.
              </>
            ) : (
              <>
                Add your email to <EnvName>ADMIN_EMAILS</EnvName> to get an alert for each new order, unpaid order
                and new review, and a copy of each later email to the customer.
              </>
            )}
          </Note>
          {alerts > 0 && !status.unpaidAlerts && (
            <Note>
              Unpaid-order alerts are off until <EnvName>CRON_SECRET</EnvName> is set in the site&apos;s environment
              variables.
            </Note>
          )}
        </>
      ) : (
        <Note>
          No order emails go out until <EnvName>RESEND_API_KEY</EnvName> is set in the site&apos;s environment
          variables.
        </Note>
      )}
      <DashboardLink href={DASHBOARD_URL}>Open Resend dashboard</DashboardLink>
    </div>
  );
}
