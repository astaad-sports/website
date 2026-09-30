import { whatsappHref } from "@/lib/format";

import { WhatsAppGlyph } from "./whatsapp-glyph";

/**
 * A round WhatsApp button pinned to the bottom right of every storefront
 * page, opening a chat with the support mobile from Settings. On phones it
 * sits above the tab bar where a page has one (see --tab-bar-height in
 * globals.css). Nothing without a support mobile.
 */
export function WhatsAppButton({ phone }: { phone: string | null }) {
  const href = phone ? whatsappHref(phone) : null;
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 bottom-[calc(16px+var(--tab-bar-height,0px))] z-30 flex size-14 items-center justify-center rounded-full border border-surface-dark-raised bg-surface-dark text-on-dark shadow-float transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-surface-dark-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:right-6 md:bottom-6"
    >
      <WhatsAppGlyph className="size-7" />
    </a>
  );
}
