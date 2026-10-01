// What every public page tells search engines and link previews about
// itself. Pure: paths are resolved against the root layout's metadataBase.
import type { Metadata } from "next";

export const SITE_NAME = "Astaad Sports";

/** The picture a shared link shows: 1200x630, as WhatsApp and the others want it. */
export interface ShareImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

/** For pages with no picture of their own. */
export const DEFAULT_SHARE_IMAGE: ShareImage = {
  url: "/brand/og-default.jpg",
  ...SHARE_IMAGE_SIZE,
  alt: "Astaad Sports English willow cricket bats",
};

/** A short, stable stamp of some text, so a new photo gives the picture a new address. */
function stamp(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}

/**
 * A product's share picture, made from `photo` at /og/<slug>.jpg (see
 * shareImage). Link previews keep a picture for a long time, so its address
 * changes when the photo does.
 */
export function productShareImage(product: { slug: string; name: string }, photo: string): ShareImage {
  return { url: `/og/${product.slug}.jpg?v=${stamp(photo)}`, ...SHARE_IMAGE_SIZE, alt: `Astaad ${product.name}` };
}

/** Shared by the root layout and pageMetadata: a page's `openGraph` replaces the layout's whole object. */
export const OPEN_GRAPH_BASE = { siteName: SITE_NAME, locale: "en_IN", type: "website" } as const;

/**
 * A public page's metadata: title, description, its one true address
 * (canonical) and the Open Graph tags a link preview reads. `title` goes
 * through the root layout's "%s | Astaad Sports" unless it is `absolute`.
 * Next derives the Twitter card from the Open Graph tags.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_SHARE_IMAGE,
}: {
  title: string | { absolute: string };
  description: string;
  /** The page's path on the site, "/" for home. */
  path: string;
  image?: ShareImage;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...OPEN_GRAPH_BASE,
      title: typeof title === "string" ? title : title.absolute,
      description,
      url: path,
      images: [image],
    },
  };
}
