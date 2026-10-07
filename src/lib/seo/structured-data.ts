// Structured data (schema.org JSON-LD): what search engines read to show a
// product's price, stock and stars, the trail of pages above it, and who the
// store is. Pure: `base` is the site's address (see siteUrl).
import { sizeHref, slugify, type StoreBat } from "@/lib/products/model";
import { variantSoldOut } from "@/lib/products/variants";
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

/** How long a customer has to return an item, as /returns promises. */
export const RETURN_WINDOW_DAYS = 7;

/**
 * The returns policy in the terms search engines read. It says what
 * src/app/returns/page.tsx says, and the two must change together: 7 days
 * from delivery, by courier, for unused items, refunded in full. The customer
 * pays to send back a change of mind, and we pay for a damaged, defective or
 * wrong item. What the page excepts (an engraved bat) has no term here.
 */
const RETURN_POLICY = {
  applicableCountry: "IN",
  returnPolicyCategory: `${CONTEXT}/MerchantReturnFiniteReturnWindow`,
  merchantReturnDays: RETURN_WINDOW_DAYS,
  returnMethod: `${CONTEXT}/ReturnByMail`,
  returnFees: `${CONTEXT}/ReturnFeesCustomerResponsibility`,
};

/** The whole policy, for the store itself. */
function storeReturnPolicy(base: string): JsonLd {
  return {
    "@type": "MerchantReturnPolicy",
    ...RETURN_POLICY,
    returnPolicyCountry: "IN",
    itemCondition: `${CONTEXT}/NewCondition`,
    refundType: `${CONTEXT}/FullRefund`,
    customerRemorseReturnFees: `${CONTEXT}/ReturnFeesCustomerResponsibility`,
    itemDefectReturnFees: `${CONTEXT}/FreeReturn`,
    merchantReturnLink: absoluteUrl("/returns", base),
  };
}

/** Who the store is, in a sentence, as the footer and /about put it. */
const STORE_DESCRIPTION =
  "Astaad Sports designs and builds cricket bats and gear in Delhi and sells them directly to players across India: English willow and Kashmir willow bats built to order, plus pads, gloves, helmets and kitbags.";

/** A 10-digit Indian number as "+919876543210"; anything else as typed. */
function telephone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^\d{10}$/.test(digits) ? `+91${digits}` : phone;
}

/**
 * The store and the site, for the home page: the name Google shows for the
 * site, the crest, the contact details Settings has, and the returns policy
 * that covers everything it sells. The store carries no rating of its own;
 * reviews are of products.
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
      description: STORE_DESCRIPTION,
      logo: absoluteUrl("/brand/astaad-crest.png", base),
      areaServed: "IN",
      currenciesAccepted: "INR",
      ...(sameAs.length ? { sameAs } : {}),
      ...(settings.supportEmail ? { email: settings.supportEmail } : {}),
      ...(settings.supportPhone ? { telephone: telephone(settings.supportPhone) } : {}),
      ...(settings.storeAddress
        ? { address: { "@type": "PostalAddress", streetAddress: settings.storeAddress, addressCountry: "IN" } }
        : {}),
      hasMerchantReturnPolicy: storeReturnPolicy(base),
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
 * What one thing costs and whether it can be bought. A running offer's last
 * day is the price's last day. The price is in rupees, as the page shows it.
 * Each offer repeats the delivery charge and the returns policy in the few
 * terms a product may carry.
 */
function offerJsonLd(
  { price, soldOut, offer }: { price: number; soldOut: boolean; offer: StoreBat["offer"] },
  url: string,
  deliveryFeePaise: number
): JsonLd {
  return {
    "@type": "Offer",
    priceCurrency: "INR",
    price,
    availability: `${CONTEXT}/${soldOut ? "OutOfStock" : "InStock"}`,
    itemCondition: `${CONTEXT}/NewCondition`,
    url,
    ...(offer ? { priceValidUntil: offer.endsAt.slice(0, 10) } : {}),
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: deliveryFeePaise / 100, currency: "INR" },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    },
    hasMerchantReturnPolicy: { "@type": "MerchantReturnPolicy", ...RETURN_POLICY },
  };
}

/** One size of a product, listed to search engines as a product of its own. */
export interface SizeListing {
  /** Its own identifier, which must never change: "goat-sh". */
  id: string;
  /** "SH / Full Size". */
  label: string;
  /** Who it suits, or how long it is: "15+ yrs · 5'4–5'10 tall", "35 inches long". */
  detail?: string;
  /** The product's page opened on this size: "/bats/goat?size=SH". */
  path: string;
  price: number;
  soldOut: boolean;
}

/**
 * A product's sizes as listings: each with its own price and stock, at the
 * address that opens the product's page on it (see sizeHref). `path` is the
 * product's page. A size sold right- and left-handed is in stock while
 * either hand is.
 */
export function sizeListings(
  product: Pick<StoreBat, "slug" | "sizes" | "variants" | "soldOut">,
  path: string
): SizeListing[] {
  return product.sizes.flatMap((size) => {
    const inSize = product.variants.filter((variant) => variant.size === size.code);
    if (inSize.length === 0) return [];
    return [
      {
        id: `${product.slug}-${slugify(size.code)}`,
        label: size.label,
        detail: size.hint,
        path: sizeHref(path, size.code),
        price: inSize[0].price,
        soldOut: inSize.every((variant) => variantSoldOut(product, variant)),
      },
    ];
  });
}

/** The colour words a product's name can carry, as the store writes them. */
const COLOURS = [
  "Black",
  "White",
  "Red",
  "Blue",
  "Navy",
  "Green",
  "Yellow",
  "Orange",
  "Pink",
  "Purple",
  "Grey",
  "Gray",
  "Silver",
  "Gold",
  "Maroon",
  "Brown",
];

/**
 * The colour a gear product's name states: "Legacy Pro Pads Black" is
 * "Black", and two colours are joined the way shopping listings want them,
 * "Black/Red". Undefined when the name states none. Gear is listed once per
 * colour, so the name is where its colour is kept. Not for bats: "Black
 * Edition" is a model, not a colour.
 */
export function colourInName(name: string): string | undefined {
  const words = name.split(/[^A-Za-z]+/).map((word) => word.toLowerCase());
  const found = COLOURS.filter((colour) => words.includes(colour.toLowerCase()));
  return found.length ? found.join("/") : undefined;
}

/**
 * A product page's data. `reviews` are the product's own published reviews,
 * which the page shows: the rating counts those with stars and is left out
 * when none has any, and the first few with a name and stars are listed.
 *
 * With `group`, a product sold in two or more sizes is a ProductGroup whose
 * variants are the sizes, each a product with its own price and stock: a
 * shopping listing needs one exact price, which a range of prices is not.
 * Otherwise it is one Product at the price its page shows, in its one size
 * when it has one. `color` goes on the product and on each of its sizes.
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
  group,
  color,
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
  /** The product's identifier, which must never change (its slug), and its sizes. */
  group?: { id: string; sizes: SizeListing[] };
  /** "Black", "Black/Red" (see colourInName). */
  color?: string;
}): JsonLd {
  const url = absoluteUrl(path, base);
  const images = product.images.map((src) => absoluteUrl(src, base));
  const { average, rated } = summariseReviews(reviews);
  const listed = reviews.filter((review) => review.name && review.rating).slice(0, REVIEWS_IN_DATA);
  const shared = {
    description,
    category,
    url,
    image: images,
    brand: { "@type": "Brand", name: "Astaad" },
    ...(color ? { color } : {}),
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

  if (group && group.sizes.length > 1) {
    // A description the admin ended with a full stop must not give "..".
    const words = description.replace(/[.\s]+$/, "");
    return {
      "@context": CONTEXT,
      "@type": "ProductGroup",
      name,
      ...shared,
      productGroupID: group.id,
      variesBy: [`${CONTEXT}/size`],
      hasVariant: group.sizes.map((size) => ({
        "@type": "Product",
        sku: size.id,
        name: `${name}, ${size.label}`,
        description: `${words}. Size: ${size.label}${size.detail ? ` (${size.detail})` : ""}.`,
        size: size.label,
        ...(color ? { color } : {}),
        image: images[0],
        offers: offerJsonLd(
          { price: size.price, soldOut: size.soldOut, offer: product.offer },
          absoluteUrl(size.path, base),
          deliveryFeePaise
        ),
      })),
    };
  }

  // One size, or sizes at one price: that price, else the one the page shows.
  const prices = new Set(product.variants.map((variant) => variant.price));
  const price = prices.size === 1 ? [...prices][0] : product.price;
  return {
    "@context": CONTEXT,
    "@type": "Product",
    name,
    ...shared,
    ...(group?.sizes.length === 1 ? { size: group.sizes[0].label } : {}),
    offers: offerJsonLd({ price, soldOut: product.soldOut, offer: product.offer }, url, deliveryFeePaise),
  };
}
