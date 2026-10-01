"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

/**
 * The Google tag (gtag.js) for Google Analytics, loaded once the page is
 * interactive. Analytics counts a page view on load and on each move between
 * pages by itself. The admin is left out: it is the owner at work, not a
 * visitor. The root layout decides whether there is an `id` at all (see
 * analyticsId).
 */
export function GoogleAnalytics({ id }: { id: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
