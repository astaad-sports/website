// The product tiles in "What players are buying" and "Complete your kit",
// built from the catalogue on the server and handed to KitCard.
import { batCartItem, gearCartItem, type CartItem } from "@/lib/cart";
import { DEFAULT_BAT_CONFIG, gearHref, type KitItem } from "@/lib/catalogue";
import {
  entryBat,
  findStoreBat,
  kitGear,
  type StoreBat,
  type StoreCatalogue,
  type StoreGear,
  type StoreOffer,
} from "@/lib/products/model";

/** A product as a kit tile: what the tile shows, and what its cart button adds. */
export interface KitTile extends KitItem {
  href: string;
  cartItem: CartItem;
  soldOut: boolean;
  /** The running offer already in `price`. */
  offer: StoreOffer | null;
}

/** A bat as a tile, sold in its standard build. */
export function batTile(bat: StoreBat): KitTile {
  return {
    slug: bat.slug,
    category: "Bats",
    name: bat.name,
    note: bat.grade,
    price: bat.price,
    mrp: bat.mrp > bat.price ? bat.mrp : undefined,
    href: `/bats/${bat.slug}`,
    image: bat.images[0],
    imageWidth: 104,
    imageHeight: 264,
    imageTop: 40,
    cartItem: batCartItem(bat.slug, DEFAULT_BAT_CONFIG, 1, bat.customization),
    soldOut: bat.soldOut,
    offer: bat.offer,
  };
}

/** A gear product as a tile, in its category's usual size and hand. */
export function gearTile(product: StoreGear): KitTile {
  return {
    slug: product.slug,
    category: product.category,
    name: product.name,
    note: product.note,
    price: product.price,
    mrp: product.mrp,
    badge: product.badge,
    href: gearHref(product),
    image: product.images[0],
    imageWidth: product.imageWidth,
    imageHeight: product.imageHeight,
    imageTop: product.imageTop,
    cartItem: gearCartItem(product),
    soldOut: product.soldOut,
    offer: product.offer,
  };
}

/** "Complete your kit" beside a bat: one product from each gear category. */
export function kitTilesForBat(catalogue: StoreCatalogue): KitTile[] {
  return kitGear(catalogue).map(gearTile);
}

/** "Complete your kit" beside gear: the other categories, then the entry English willow bat. */
export function kitTilesForGear(catalogue: StoreCatalogue, category: string): KitTile[] {
  const bat = entryBat(catalogue);
  return [...kitGear(catalogue, category).map(gearTile), ...(bat ? [batTile(bat)] : [])];
}

// The admin has no bestseller setting, so the picks live here. This row's
// tiles are taller, so the gear cut-outs sit lower (placements from the design).
const BESTSELLER_PICKS: { slug: string; kind: "bat" | "gear"; imageTop: number; badge?: string }[] = [
  { slug: "goat", kind: "bat", imageTop: 40, badge: "No. 1" },
  { slug: "elite-batting-gloves", kind: "gear", imageTop: 70 },
  { slug: "club-cricket-helmet", kind: "gear", imageTop: 74 },
  { slug: "pro-cricket-kitbag", kind: "gear", imageTop: 96 },
];

/** The home page's "What players are buying", in the order above; a hidden pick is skipped. */
export function bestsellerTiles(catalogue: StoreCatalogue): KitTile[] {
  return BESTSELLER_PICKS.flatMap((pick) => {
    const bat = pick.kind === "bat" ? findStoreBat(catalogue, pick.slug) : undefined;
    const gear = pick.kind === "gear" ? catalogue.gear.find((product) => product.slug === pick.slug) : undefined;
    const tile = bat ? batTile(bat) : gear ? gearTile(gear) : null;
    if (!tile) return [];
    return [{ ...tile, imageTop: pick.imageTop, badge: pick.badge ?? tile.badge }];
  });
}
