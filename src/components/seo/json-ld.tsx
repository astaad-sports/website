import { serialiseJsonLd, type JsonLd as Data } from "@/lib/seo/structured-data";

/** Structured data for search engines, as a script tag in the page (see src/lib/seo/structured-data.ts). */
export function JsonLd({ data }: { data: Data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialiseJsonLd(data) }} />;
}
