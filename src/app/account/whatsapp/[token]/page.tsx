import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";
import { findLinkToken, getContactForUser } from "@/db/whatsapp";
import { requireUser } from "@/lib/auth/session";
import { linkWhatsApp } from "@/lib/whatsapp/actions";
import { maskWaId } from "@/lib/whatsapp/config";

export const metadata: Metadata = {
  title: "Link WhatsApp",
  robots: { index: false },
};

/**
 * Where the bot's "Link account" button goes: sign in, then confirm that the
 * WhatsApp number it was sent to belongs with this account. The link carries
 * a random token, not the number, and works once, for 30 minutes.
 */
export default async function LinkWhatsAppPage({ params }: PageProps<"/account/whatsapp/[token]">) {
  const { token } = await params;
  const user = await requireUser(`/account/whatsapp/${token}`);
  const [link, current] = await Promise.all([findLinkToken(token), getContactForUser(user.id)]);
  const alreadyThis = link && current?.waId === link.waId;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow bar>WhatsApp</Eyebrow>
            <h1 className="type-heading-xl">{link ? "Link your WhatsApp?" : "This link has expired"}</h1>
            <p className="type-body-lg text-ink-muted">
              {link
                ? "Your orders will show in our WhatsApp chat, and their updates will come there."
                : "Links from our WhatsApp work once, for 30 minutes. Send “Link my account” to our WhatsApp for a new one."}
            </p>
          </div>
          <div className="flex max-w-[640px] flex-col gap-4 rounded-md border border-border bg-surface-raised p-6 shadow-card">
            {link ? (
              <>
                <p className="type-body">
                  Link WhatsApp <span className="font-semibold whitespace-nowrap">{maskWaId(link.waId)}</span> to{" "}
                  <span className="font-semibold break-all">{user.email ?? "your account"}</span>?
                  {current && !alreadyThis && " It takes the place of the number linked now."}
                </p>
                <form action={linkWhatsApp.bind(null, token)} className="flex flex-wrap gap-3">
                  <Button type="submit">Link WhatsApp</Button>
                  <Button variant="outline" render={<Link href="/account" />} nativeButton={false}>
                    Not now
                  </Button>
                </form>
              </>
            ) : (
              <Button className="self-start" render={<Link href="/account#whatsapp" />} nativeButton={false}>
                Go to your account
              </Button>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
