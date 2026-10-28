import type { WhatsAppStatus } from "@/lib/whatsapp/config";

import { ConnectionLabel, DashboardLink, EnvName, Note } from "./settings-payment";

const MANAGER_URL = "https://business.facebook.com/wa/manage/message-templates/";

/**
 * Whether WhatsApp order updates and the chat bot work. Like Resend's, the
 * Meta tokens are server settings, so this only reports them and names
 * whatever is missing.
 */
export function WhatsAppSettings({ status }: { status: WhatsAppStatus }) {
  const ready = status.sending && status.webhook && status.businessNumber !== null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-[15px] leading-[22px] font-semibold">WhatsApp</span>
        <ConnectionLabel connected={ready} />
      </div>
      {status.businessNumber && (
        <Note>
          Customers write to <span className="font-semibold text-foreground">{status.businessNumber}</span>. The bot
          answers with a menu of their orders, tracking and the shop.
        </Note>
      )}
      {status.sending ? (
        <Note>
          Customers who tick the box at checkout, buy with Buy now or link WhatsApp to their account get a message
          when their order is placed, ships and is delivered. Each message template must be approved in WhatsApp
          Manager first.
        </Note>
      ) : (
        <Note>
          No WhatsApp messages go out until <EnvName>WHATSAPP_ACCESS_TOKEN</EnvName> and{" "}
          <EnvName>WHATSAPP_PHONE_NUMBER_ID</EnvName> are set in the site&apos;s environment variables.
        </Note>
      )}
      {!status.webhook && (
        <Note>
          The bot can&apos;t read messages until <EnvName>WHATSAPP_APP_SECRET</EnvName> and{" "}
          <EnvName>WHATSAPP_VERIFY_TOKEN</EnvName> are set and the webhook is added in the Meta app.
        </Note>
      )}
      {!status.businessNumber && (
        <Note>
          Set <EnvName>NEXT_PUBLIC_WHATSAPP_NUMBER</EnvName> to the store&apos;s WhatsApp number to show the opt-in at
          checkout and the Link WhatsApp button on customers&apos; accounts.
        </Note>
      )}
      <Note>
        {status.adminNumbers > 0 ? (
          <>
            New-order alerts go to {status.adminNumbers === 1 ? "the number" : `the ${status.adminNumbers} numbers`} in{" "}
            <EnvName>ADMIN_WHATSAPP_NUMBERS</EnvName>, which can also send SHIP with an order number and tracking ID to
            mark it shipped.
          </>
        ) : (
          <>
            Add your number to <EnvName>ADMIN_WHATSAPP_NUMBERS</EnvName> to get a WhatsApp alert for each new order and
            to add tracking IDs by WhatsApp.
          </>
        )}
      </Note>
      <DashboardLink href={MANAGER_URL}>Open WhatsApp Manager</DashboardLink>
    </div>
  );
}
