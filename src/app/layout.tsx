import type { Metadata } from "next";
import { connection } from "next/server";
import { Caveat, Inter, Montserrat } from "next/font/google";
import "./globals.css";

import { CatalogueProvider } from "@/components/cart/catalogue-provider";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { DEFAULT_SHARE_IMAGE, OPEN_GRAPH_BASE, SITE_NAME } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/site";

// The three Astaad families: `sans` for everything readable, `display` for
// uppercase hero and campaign headlines, `script` for one handwritten tagline.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["800", "900"],
  style: "italic",
  variable: "--font-montserrat",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-caveat",
  display: "swap",
});

// What every page starts from. Public pages add their own title, description
// and canonical address with pageMetadata; there is no canonical here, or a
// page without one would claim to be the home page.
export const metadata: Metadata = {
  // Relative addresses in metadata (canonical, share pictures) resolve against the live site.
  metadataBase: new URL(siteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Premium cricket gear for players who never settle.",
  openGraph: { ...OPEN_GRAPH_BASE, images: [DEFAULT_SHARE_IMAGE] },
  // Google Search Console's "HTML tag" check; nothing is written while it is unset.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page renders for its request, so prices follow offers that start or
  // end at midnight without anyone saving anything. The data behind them is
  // cached (see getStoreCatalogue); a small store renders quickly.
  await connection();
  const catalogue = await getStoreCatalogue();
  // Browser extensions (ColorZilla, Grammarly, dark-mode tools) add attributes
  // to <html> and <body> before React hydrates. suppressHydrationWarning
  // ignores attribute differences on these two elements only, not their children.
  return (
    <html
      lang="en-IN"
      className={`${inter.variable} ${montserrat.variable} ${caveat.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <CatalogueProvider catalogue={catalogue}>{children}</CatalogueProvider>
      </body>
    </html>
  );
}
