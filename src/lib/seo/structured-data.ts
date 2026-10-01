// Structured data (schema.org JSON-LD): what search engines read to show a
// product's price, stock and stars, the trail of pages above it, and who the
// store is. Pure: `base` is the site's address (see siteUrl).
import type { StoreBat } from "@/lib/products/model";
import { summariseReviews, type PublicReview } from "@/lib/reviews/model";
import type { Settings } from "@/lib/settings/model";
import { absoluteUrl } from "@/lib/site";

export type JsonLd = Record<string, unknown>;

const CONTEXT = "https://schema.org";

/** How many of a product's reviews go in its data; the page shows them all. */
const REVIEWS_IN_DATA = 5;

/**
 * JSON for a script tag. A "<" is written as its escape, so words a customer
 * typed in a review ("</script>") cannot end the tag.
 */
export function serialiseJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The photos a product was given, leaving out the built-in stand-in cut-outs under /images. */
export function realPhotos(images: readonly string[]): string[] {
  return images.filter((src) => !src.startsWith("/images/"));
}

/** A 10-digit Indian number as "+919876543210"; anything else as typed. */
function telephone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^\d{10}$/.test(digits) ? `+91${digits}` : phone;
}

/**
 * The store and the site, for the home page: the name Google shows for the
 * site, the crest, and the contact details Settings has. The store carries no
 * rating of its own; reviews are of products.
 */
export function storeJsonLd(
  settings: Pick<Settings, "storeName" | "supportEmail" | "supportPhone" | "storeAddress">,
  { base, sameAs = [] }: { base: string; sameAs?: string[] }
): JsonLd[] {
  const id = `${base}/#store`;
  return [
    {
      "@context": CONTEXT,
      "@type": "OnlineStore",
      "@id": id,
      name: settings.storeName,
      url: base,
      logo: absoluteUrl("/brand/astaad-crest.png", base),
      ...(sameAs.length ? { sameAs } : {}),
      ...(settings.supportEmail ? { email: settings.supportEmail } : {}),
      ...(settings.supportPhone ? { telephone: telephone(settings.supportPhone) } : {}),
      ...(settings.storeAddress
        ? { address: { "@type": "PostalAddress", streetAddress: settings.storeAddress, addressCountry: "IN" } }
        : {}),
    },
    { "@context": CONTEXT, "@type": "WebSite", name: settings.storeName, url: base, publisher: { "@id": id } },
  ];
}

/** The pages above this one and the page itself, Home first. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[], base: string): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path, base),
    })),
  };
}

/**
 * One price for every size is an Offer. Sizes with prices of their own are an
 * AggregateOffer from the lowest to the highest. A running offer's last day
 * is the price's last day. Prices are rupees, as the page shows them.
 */
function offersJsonLd(
  product: Pick<StoreBat, "price" | "variants" | "soldOut" | "offer">,
  url: string,
  deliveryFeePaise: number
): JsonLd {
  const prices = [...new Set(product.variants.length ? product.variants.map((variant) => variant.price) : [product.price])];
  const availability = `${CONTEXT}/${product.soldOut ? "OutOfStock" : "InStock"}`;
  if (prices.length > 1) {
    return {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
      availability,
      url,
    };
  }
  return {
    "@type": "Offer",
    priceCurrency: "INR",
    price: prices[0],
    availability,
    itemCondition: `${CONTEXT}/NewCondition`,
    url,
    ...(product.offer ? { priceValidUntil: product.offer.endsAt.slice(0, 10) } : {}),
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: deliveryFeePaise / 100, currency: "INR" },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    },
  };
}

/**
 * A product page's data. `reviews` are the product's own published reviews,
 * which the page shows: the rating counts those with stars and is left out
 * when none has any, and the first few with a name and stars are listed.
 */
export function productJsonLd({
  product,
  name,
  description,
  category,
  path,
  reviews,
  deliveryFeePaise,
  base,
}: {
  product: Pick<StoreBat, "images" | "price" | "variants" | "soldOut" | "offer">;
  /** As a shopper would search for it: "Astaad G.O.A.T Grade 1 English Willow Cricket Bat". */
  name: string;
  description: string;
  /** "Cricket Bats", "Cricket Helmets". */
  category: string;
  path: string;
  reviews: readonly Pick<PublicReview, "name" | "rating" | "body">[];
  deliveryFeePaise: number;
  base: string;
}): JsonLd {
  const url = absoluteUrl(path, base);
  const { average, rated } = summariseReviews(reviews);
  const listed = reviews.filter((review) => review.name && review.rating).slice(0, REVIEWS_IN_DATA);
  return {
    "@context": CONTEXT,
    "@type": "Product",
    name,
    description,
    category,
    url,
    image: product.images.map((src) => absoluteUrl(src, base)),
    brand: { "@type": "Brand", name: "Astaad" },
    offers: offersJsonLd(product, url, deliveryFeePaise),
    ...(average !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(average.toFixed(1)),
            bestRating: 5,
            ratingCount: rated,
          },
        }
      : {}),
    ...(listed.length
      ? {
          review: listed.map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.name },
            reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
            ...(review.body ? { reviewBody: review.body } : {}),
          })),
        }
      : {}),
  };
}
