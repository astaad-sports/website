import type { Metadata } from "next";
import { Caveat, Inter, Montserrat } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "Astaad Sports",
    template: "%s | Astaad Sports",
  },
  description: "Premium cricket gear for players who never settle.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Browser extensions (ColorZilla, Grammarly, dark-mode tools) add attributes
  // to <html> and <body> before React hydrates. suppressHydrationWarning
  // ignores attribute differences on these two elements only, not their children.
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} ${caveat.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
