// The product tiles in "What players are buying" and "Complete your kit",
// built from the catalogue on the server and handed to KitCard.
import { batCartItem, gearCartItem, type CartItem } from "@/lib/cart";
import { DEFAULT_BAT_CONFIG, gearHref, type GearCategorySlug, type KitItem } from "@/lib/catalogue";
import {
  entryBat,
  findStoreBat,
  gearInCategory,
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
    // A bat photo runs toe to handle, so it stops above the name.
    imageHeight: 232,
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

// The admin has no bestseller setting, so the picks live here: the G.O.A.T,
// then each of these categories' featured product (or its first). The gear
// cut-outs sit a little lower in this row than in their own card (placements
// from the design), whatever box the product's photo has.
const BESTSELLER_BAT = { slug: "goat", imageTop: 40, badge: "No. 1" };
const BESTSELLER_CATEGORIES: { category: GearCategorySlug; lower: number }[] = [
  { category: "batting-gloves", lower: 14 },
  { category: "helmets", lower: 14 },
  { category: "cricket-kitbags", lower: 4 },
];

/** The home page's "What players are buying", in the order above; a pick with nothing to show is skipped. */
export function bestsellerTiles(catalogue: StoreCatalogue): KitTile[] {
  const bat = findStoreBat(catalogue, BESTSELLER_BAT.slug);
  const batTiles = bat ? [{ ...batTile(bat), imageTop: BESTSELLER_BAT.imageTop, badge: BESTSELLER_BAT.badge }] : [];
  const gearTiles = BESTSELLER_CATEGORIES.flatMap(({ category, lower }) => {
    const products = gearInCategory(catalogue, category);
    const pick = products.find((product) => product.featured) ?? products[0];
    return pick ? [{ ...gearTile(pick), imageTop: pick.imageTop + lower }] : [];
  });
  return [...batTiles, ...gearTiles];
}
