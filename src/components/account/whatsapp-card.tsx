import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { unlinkWhatsAppAccount } from "@/lib/whatsapp/actions";
import { formatWaId } from "@/lib/whatsapp/config";
import { cn } from "@/lib/utils";

/** The text that starts linking: the bot answers it with a sign-in link (see src/lib/whatsapp/bot.ts). */
const LINK_TEXT = "Link my account";

/**
 * The customer's WhatsApp: the number linked to the account, with Unlink, or
 * a button that opens the store's WhatsApp with "Link my account" typed in.
 * Only shown once the store's WhatsApp number is set.
 */
export function WhatsAppCard({
  linked,
  businessNumber,
  justLinked,
  className,
}: {
  /** The linked number as a waId, or null. */
  linked: string | null;
  /** The store's WhatsApp number as a waId. */
  businessNumber: string;
  justLinked: boolean;
  className?: string;
}) {
  return (
    <section id="whatsapp" aria-labelledby="account-whatsapp" className={cn("scroll-mt-24 gap-4 p-6", className)}>
      <h2 id="account-whatsapp" className="type-heading-sm flex items-center gap-2">
        <MessageCircle className="size-5" strokeWidth={1.5} aria-hidden="true" />
        WhatsApp
      </h2>
      {linked ? (
        <>
          <p className="type-body">
            {justLinked && <span className="font-semibold">Linked. </span>}
            Updates on your orders come to{" "}
            <span className="font-semibold whitespace-nowrap">{formatWaId(linked)}</span>, and you can check your
            orders there any time.
          </p>
          <form action={unlinkWhatsAppAccount}>
            <Button type="submit" variant="outline">
              Unlink
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="type-body">
            Link your WhatsApp to get updates on all your orders there, and check them any time by chat.
          </p>
          <Button
            className="self-start"
            render={
              <a
                href={`https://wa.me/${businessNumber}?text=${encodeURIComponent(LINK_TEXT)}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            nativeButton={false}
          >
            Link WhatsApp
          </Button>
        </>
      )}
    </section>
  );
}
