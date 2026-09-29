// Storefront catalogue for the Astaad Sports home and product pages.
// Prices are rupees; format them with `formatPrice`.
import { siteImage, type SiteImage } from "./site-images";
import { listInWords, midSentence } from "./words";

export type GearCategorySlug =
  | "batting-pads"
  | "batting-gloves"
  | "helmets"
  | "cricket-kitbags";

export interface StoreCategory {
  slug: string;
  name: string;
  href: string;
  number: string;
  kind: "bats" | "gear";
  /** One sentence for the category hero. */
  tagline: string;
  image: string;
  /** Placement inside the 280px category tile. */
  tile: { width: number; height: number; top: number; shadowWidth: number; shadowTop: number };
}

export const STORE_CATEGORIES: StoreCategory[] = [
  {
    slug: "bats",
    kind: "bats",
    tagline: "Choose your willow. Build your game.",
    name: "Bats",
    href: "/shop/bats",
    number: "01",
    image: siteImage("categories/bats").src,
    tile: { width: 88, height: 216, top: 4, shadowWidth: 140, shadowTop: 198 },
  },
  {
    slug: "batting-pads",
    kind: "gear",
    tagline: "Light on the legs, solid where it counts.",
    name: "Batting Pads",
    href: "/shop/batting-pads",
    number: "02",
    image: siteImage("categories/batting-pads").src,
    tile: { width: 146, height: 200, top: 12, shadowWidth: 170, shadowTop: 184 },
  },
  {
    slug: "batting-gloves",
    kind: "gear",
    tagline: "Grip, feel and protection for every innings.",
    name: "Batting Gloves",
    href: "/shop/batting-gloves",
    number: "03",
    image: siteImage("categories/batting-gloves").src,
    tile: { width: 180, height: 166, top: 28, shadowWidth: 180, shadowTop: 168 },
  },
  {
    slug: "helmets",
    kind: "gear",
    tagline: "Head protection you forget you are wearing.",
    name: "Helmets",
    href: "/shop/helmets",
    number: "04",
    image: siteImage("categories/helmets").src,
    tile: { width: 170, height: 164, top: 30, shadowWidth: 170, shadowTop: 168 },
  },
  {
    slug: "cricket-kitbags",
    kind: "gear",
    tagline: "Room for the full kit, built for the road.",
    name: "Cricket Kitbags",
    href: "/shop/cricket-kitbags",
    number: "05",
    image: siteImage("categories/cricket-kitbags").src,
    tile: { width: 104, height: 214, top: 6, shadowWidth: 150, shadowTop: 196 },
  },
];

export interface Bat {
  slug: string;
  name: string;
  /** "Greatest Of All Time" beside G.O.A.T */
  tagline?: string;
  grade: string;
  price: number;
  mrp: number;
  /** Percentage off the MRP. */
  off: number;
  /** Extra black chips beside the discount, e.g. "Top 1%". */
  badges?: string[];
  /** Puts the bat on a dark plate. No bat has it now: the Black Edition sits on the light plate like the others. */
  dark?: boolean;
  rating?: number;
  reviews?: number;
  /** The "Product Details" specification line. */
  details: string;
  /** The "Willow Grade" note. */
  willow: string;
}

export const BAT_IMAGE = "/images/bat-english-willow.png";

const FINISH =
  "Sarawak cane handle with three rubber inserts · 40 mm edges · Astaad lion crest face sticker · supplied with a padded full-length cover.";

export const BATS: Bat[] = [
  {
    slug: "run-machine",
    name: "Run Machine",
    grade: "Grade 4 English Willow",
    price: 7699,
    mrp: 10999,
    off: 30,
    rating: 4.7,
    reviews: 128,
    details: `Run Machine · Grade 4 English Willow · ${FINISH}`,
    willow:
      "Grade 4 English Willow: 4 to 6 straight grains with some natural blemish and colour. Performance-first willow at an entry price.",
  },
  {
    slug: "combat-pro",
    name: "Combat Pro",
    grade: "Grade 3 English Willow",
    price: 9799,
    mrp: 13999,
    off: 30,
    details: `Combat Pro · Grade 3 English Willow · ${FINISH}`,
    willow: "Grade 3 English Willow. Naturally air-dried and pressed for a lively face that only gets better.",
  },
  {
    slug: "black-edition",
    name: "Black Edition",
    grade: "Grade 2 English Willow",
    price: 12599,
    mrp: 20999,
    off: 40,
    details: `Black Edition · Grade 2 English Willow · ${FINISH}`,
    willow: "Grade 2 English Willow. Naturally air-dried and pressed for a lively face that only gets better.",
  },
  {
    slug: "goat",
    name: "G.O.A.T",
    tagline: "Greatest Of All Time",
    grade: "Grade 1 English Willow",
    price: 16499,
    mrp: 29999,
    off: 45,
    details: `G.O.A.T · Grade 1 English Willow · ${FINISH}`,
    willow: "Grade 1 English Willow. Naturally air-dried and pressed for a lively face that only gets better.",
  },
  {
    slug: "the-godfather",
    name: "The Godfather",
    grade: "Grade 1+ Players English Willow",
    price: 19799,
    mrp: 35999,
    off: 45,
    details: `The Godfather · Grade 1+ Players English Willow · ${FINISH}`,
    willow: "Grade 1+ Players English Willow. Naturally air-dried and pressed for a lively face that only gets better.",
  },
  {
    slug: "legacy-one",
    name: "Legacy One",
    grade: "Top 1% of Grade 1+ Players English Willow",
    price: 23099,
    mrp: 41999,
    off: 45,
    badges: ["Top 1%"],
    details: `Legacy One · Top 1% of Grade 1+ Players English Willow · ${FINISH}`,
    willow:
      "The top 1% of Grade 1+ Players English Willow. Naturally air-dried and pressed for a lively face that only gets better.",
  },
];

export function getBat(slug: string): Bat | undefined {
  return BATS.find((bat) => bat.slug === slug);
}

export function getCategory(slug: string): StoreCategory | undefined {
  return STORE_CATEGORIES.find((category) => category.slug === slug);
}

export const GEAR_CATEGORY_SLUGS = STORE_CATEGORIES.filter(
  (category) => category.kind === "gear"
).map((category) => category.slug as GearCategorySlug);

/**
 * The bat ranges with their own page at /shop/[slug]; English willow is listed
 * on the home page instead. Each page lists the catalogue's bats in the
 * subcategory of the same slug. /shop/bats lists every range's bats together.
 */
export interface BatRange {
  slug: "kashmir-willow" | "tennis-bats";
  name: string;
  /** The range mid-sentence: "No Kashmir willow bats yet." */
  noun: string;
  href: string;
  /** One sentence, on the home page tile and the range hero. */
  tagline: string;
  /** The range's bats lying diagonally, on the home page tile and the range hero. */
  image: string;
  /** Shows the bat cut-out partly desaturated, for a range that borrows another's photo. */
  grayscale?: boolean;
}

/** The size of a bat lying diagonally, which the range hero doubles. */
export const DIAGONAL_BAT_TILE: StoreCategory["tile"] = { width: 224, height: 158, top: 44, shadowWidth: 200, shadowTop: 150 };

export const BAT_RANGES: BatRange[] = [
  {
    slug: "kashmir-willow",
    name: "Kashmir Willow",
    noun: "Kashmir willow bats",
    href: "/shop/kashmir-willow",
    tagline: "Durable, value-driven. Ready to play.",
    image: siteImage("bats/kashmir-diagonal").src,
  },
  {
    slug: "tennis-bats",
    name: "Tennis Bats",
    noun: "tennis bats",
    href: "/shop/tennis-bats",
    tagline: "Light, fast and made for the gully.",
    image: siteImage("bats/tennis-diagonal").src,
  },
];

export function getBatRange(slug: string): BatRange | undefined {
  return BAT_RANGES.find((range) => range.slug === slug);
}

export interface KitItem {
  slug: string;
  category: string;
  name: string;
  note?: string;
  price: number;
  mrp?: number;
  badge?: string;
  href?: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  /** Placement of the cut-out inside a KitCard tile. */
  imageTop: number;
}

export interface GearProduct extends KitItem {
  categorySlug: GearCategorySlug;
  line: string;
  /** The category's entry model, from the design: shown on the home and product pages. */
  featured?: boolean;
  /** A placeholder model until the real range is supplied. */
  placeholder?: boolean;
}

const GLOVES_IMAGE = { image: "/images/batting-gloves.png", imageWidth: 192, imageHeight: 178, imageTop: 56 };
const PADS_IMAGE = { image: "/images/batting-pads.png", imageWidth: 160, imageHeight: 184, imageTop: 48 };
const HELMET_IMAGE = { image: "/images/helmet.png", imageWidth: 168, imageHeight: 176, imageTop: 60 };
const KITBAG_IMAGE = { image: "/images/kitbag.png", imageWidth: 248, imageHeight: 150, imageTop: 84 };

/**
 * Pads, gloves, helmets and kitbags. The four `featured` entries and their
 * prices come from the design. The `placeholder` models reuse the same
 * cut-out with plausible prices so the category pages have a range to show;
 * replace them with the real catalogue.
 */
export const GEAR: GearProduct[] = [
  { slug: "elite-batting-gloves", categorySlug: "batting-gloves", category: "Batting Gloves", line: "Elite", name: "Elite Batting Gloves", note: "Pro sheepskin palm", price: 4999, badge: "Bestseller", featured: true, ...GLOVES_IMAGE },
  { slug: "pro-batting-gloves", categorySlug: "batting-gloves", category: "Batting Gloves", line: "Pro", name: "Pro Batting Gloves", note: "Split finger · right hand", price: 6499, placeholder: true, ...GLOVES_IMAGE },
  { slug: "players-batting-gloves", categorySlug: "batting-gloves", category: "Batting Gloves", line: "Players", name: "Players Batting Gloves", note: "Sausage finger · right hand", price: 8499, placeholder: true, ...GLOVES_IMAGE },

  { slug: "pro-batting-pads", categorySlug: "batting-pads", category: "Batting Pads", line: "Pro", name: "Pro Batting Pads", note: "Men\u2019s · right hand", price: 5499, featured: true, ...PADS_IMAGE },
  { slug: "elite-batting-pads", categorySlug: "batting-pads", category: "Batting Pads", line: "Elite", name: "Elite Batting Pads", note: "Men\u2019s · ambidextrous", price: 7499, placeholder: true, ...PADS_IMAGE },
  { slug: "players-batting-pads", categorySlug: "batting-pads", category: "Batting Pads", line: "Players", name: "Players Batting Pads", note: "Men\u2019s · right hand", price: 9999, placeholder: true, ...PADS_IMAGE },

  { slug: "club-cricket-helmet", categorySlug: "helmets", category: "Helmet", line: "Club", name: "Club Cricket Helmet", note: "Steel grille · adjustable", price: 6999, badge: "Bestseller", featured: true, ...HELMET_IMAGE },
  { slug: "pro-cricket-helmet", categorySlug: "helmets", category: "Helmet", line: "Pro", name: "Pro Cricket Helmet", note: "Steel grille · vented shell", price: 8999, placeholder: true, ...HELMET_IMAGE },
  { slug: "elite-cricket-helmet", categorySlug: "helmets", category: "Helmet", line: "Elite", name: "Elite Cricket Helmet", note: "Steel grille · lightweight shell", price: 11499, placeholder: true, ...HELMET_IMAGE },

  { slug: "pro-cricket-kitbag", categorySlug: "cricket-kitbags", category: "Cricket Kitbag", line: "Pro", name: "Pro Cricket Kitbag", note: "Wheelie · full kit", price: 3499, badge: "Bestseller", featured: true, ...KITBAG_IMAGE },
  { slug: "elite-cricket-kitbag", categorySlug: "cricket-kitbags", category: "Cricket Kitbag", line: "Elite", name: "Elite Cricket Kitbag", note: "Wheelie · full kit · bat sleeve", price: 5499, placeholder: true, ...KITBAG_IMAGE },
  { slug: "players-cricket-kitbag", categorySlug: "cricket-kitbags", category: "Cricket Kitbag", line: "Players", name: "Players Cricket Kitbag", note: "Wheelie · two-kit · bat sleeve", price: 7999, placeholder: true, ...KITBAG_IMAGE },
];

export function gearHref(product: Pick<GearProduct, "categorySlug" | "slug">): string {
  return `/shop/${product.categorySlug}/${product.slug}`;
}

for (const product of GEAR) {
  product.href = gearHref(product);
}

/** The sizes and hands one gear product is sold in. */
export interface GearOffered {
  sizes: string[];
  hands: boolean;
}

export interface GearCategoryContent {
  /**
   * Every size the category can come in. Each product is sold in the ones
   * ticked for it in the admin (see src/lib/products/variants.ts).
   */
  sizes?: string[];
  /** The usual size: what a size picker starts on when the product has it. */
  defaultSize?: string;
  /** The sizes a new product starts with; every size when not given. */
  newSizes?: string[];
  /** Pads and gloves can come left- and right-handed. */
  hands?: boolean;
  /** One sentence used in the "Product details" row, naming the sizes and hands the product is sold in. */
  summary: (offered: GearOffered) => string;
  sizing?: (offered: GearOffered) => string;
  care: string;
}

/** "boys, youth and men’s sizes", "men’s size"; `noun` is ["size", "sizes"]. */
function sizesPhrase(sizes: string[], [one, many]: [string, string]): string {
  return `${listInWords(sizes.map(midSentence))} ${sizes.length === 1 ? one : many}`;
}

/** Pads and gloves follow the same sizing; `advice` is what to do between two sizes. */
function standardSizing(sizes: string[], advice: string): string {
  if (sizes.length === 1) return `${sizes[0]} follows standard cricket sizing.`;
  return `${listInWords(sizes)} follow standard cricket sizing. Between two sizes? ${advice}`;
}

/** Category-level copy for the gear product pages. Placeholder until the real range lands. */
export const GEAR_CATEGORY_CONTENT: Record<GearCategorySlug, GearCategoryContent> = {
  "batting-pads": {
    sizes: ["Boys", "Youth", "Men\u2019s"],
    defaultSize: "Men\u2019s",
    newSizes: ["Men\u2019s"],
    hands: true,
    summary: ({ sizes, hands }) =>
      [
        hands ? "Batting pads with a right- or left-hand cut" : "Batting pads",
        sizes.length ? `in ${sizesPhrase(sizes, ["size", "sizes"])}` : null,
      ]
        .filter(Boolean)
        .join(", ") + ".",
    sizing: ({ sizes }) => standardSizing(sizes, "Choose the smaller one for a snug fit that will not slip on the run."),
    care: "Air dry after play, brush off dirt and keep out of direct sun. Store flat with the straps undone.",
  },
  "batting-gloves": {
    sizes: ["Boys", "Youth", "Men\u2019s"],
    defaultSize: "Men\u2019s",
    newSizes: ["Men\u2019s"],
    hands: true,
    summary: ({ sizes, hands }) =>
      [
        hands ? "Batting gloves cut for the right or left hand" : "Batting gloves",
        sizes.length ? `in ${sizesPhrase(sizes, ["size", "sizes"])}` : null,
      ]
        .filter(Boolean)
        .join(", ") + ".",
    sizing: ({ sizes }) => standardSizing(sizes, "Choose the smaller one so the fingers sit fully in the finger rolls."),
    care: "Air dry palm-up after every innings and keep out of direct sun. Never machine wash.",
  },
  helmets: {
    sizes: ["Small", "Medium", "Large", "XL"],
    defaultSize: "Medium",
    newSizes: ["Medium", "Large", "XL"],
    summary: ({ sizes }) =>
      sizes.length
        ? `A cricket helmet with a steel grille and an adjustable fit, in ${sizesPhrase(sizes, ["shell", "shells"])}.`
        : "A cricket helmet with a steel grille and an adjustable fit.",
    sizing: ({ sizes }) =>
      sizes.length > 1
        ? "Measure around the head just above the ears. Between two sizes? Choose the smaller shell and open the adjuster."
        : "Measure around the head just above the ears, then set the adjuster for a snug fit.",
    care: "Wipe the shell and liner after play, check the grille bolts before each season, and replace the helmet after any hard impact.",
  },
  "cricket-kitbags": {
    summary: () => "A wheeled cricket kitbag with room for a full kit, in one size.",
    care: "Empty and air the bag after wet days, wipe the wheels and store it unzipped.",
  },
};

export function getGear(slug: string): GearProduct | undefined {
  return GEAR.find((item) => item.slug === slug);
}

export function getGearByCategory(slug: string): GearProduct[] {
  return GEAR.filter((item) => item.categorySlug === slug);
}

/** One product per gear category: the "complete your kit" row. */
export const KIT_ITEMS: KitItem[] = [
  "elite-batting-gloves",
  "pro-batting-pads",
  "club-cricket-helmet",
  "pro-cricket-kitbag",
].map((slug) => getGear(slug)!);

/** A bat as a kit tile, for cross-selling on the gear pages. */
export function batAsKitItem(bat: Bat): KitItem {
  return {
    slug: bat.slug,
    category: "Bats",
    name: bat.name,
    note: bat.grade,
    price: bat.price,
    mrp: bat.mrp,
    href: `/bats/${bat.slug}`,
    image: BAT_IMAGE,
    imageWidth: 104,
    imageHeight: 264,
    imageTop: 40,
  };
}

/** The home page "What players are buying" row. */
export const BESTSELLERS: KitItem[] = [
  {
    slug: "goat",
    category: "Bats",
    name: "G.O.A.T",
    note: "Grade 1 English Willow",
    price: 16499,
    mrp: 29999,
    badge: "No. 1",
    href: "/bats/goat",
    image: BAT_IMAGE,
    imageWidth: 104,
    imageHeight: 264,
    imageTop: 40,
  },
  { ...KIT_ITEMS[0], imageTop: 70 },
  { ...KIT_ITEMS[2], imageTop: 74 },
  { ...KIT_ITEMS[3], imageTop: 96 },
];

export interface BatSize {
  code: string;
  /** "SH / Full Size" */
  label: string;
  age: string;
  height: string;
  length: string;
  longHandle?: boolean;
}

/** The sizes English and Kashmir willow bats can come in; each bat is sold in the ones ticked for it in the admin. */
export const BAT_SIZES: BatSize[] = [
  { code: "6", label: "Size 6", age: "10–12 years", height: "4'6\" – 5'0\"", length: "31.5\"" },
  { code: "H", label: "H / Harrow", age: "12–14 years", height: "5'0\" – 5'4\"", length: "32.75\"" },
  { code: "SH", label: "SH / Full Size", age: "15+ years", height: "5'4\" – 5'10\"", length: "33.5\"" },
  { code: "LH", label: "LH / Long Handle", age: "15+ years", height: "5'10\"+", length: "34.5\"", longHandle: true },
];

/** Tennis bats come in two lengths, at one price. They go by length, not by age or height. */
export const TENNIS_BAT_SIZES: Pick<BatSize, "code" | "label" | "length">[] = [
  { code: "FS", label: "Full Size", length: "35\"" },
  { code: "SH", label: "SH / Standard", length: "33.5\"" },
];

/** The usual bat size: what a size picker starts on when the bat has it. */
export const DEFAULT_BAT_SIZE = "SH";

export interface BatOption {
  label: string;
  hint: string;
  /** A photo of the shape, for profiles and toes. */
  picture?: SiteImage;
}

export const BAT_WEIGHTS: BatOption[] = [
  { label: "1120–1150 g", hint: "Light · quick hands" },
  { label: "1150–1180 g", hint: "Balanced · most players" },
  { label: "1180–1220 g", hint: "Heavy · power hitters" },
];

// The profile photos are side views, with the sweet spot glowing.
export const BAT_PROFILES: BatOption[] = [
  { label: "Duckbill Players", hint: "Low swell, big toe", picture: siteImage("bat-options/profile-duckbill") },
  { label: "Mid to Low", hint: "All-round middle", picture: siteImage("bat-options/profile-mid-to-low") },
  { label: "Full Spine", hint: "Max wood, high spine", picture: siteImage("bat-options/profile-full") },
];

export const BAT_HANDLES: BatOption[] = [
  { label: "Round", hint: "Classic grip" },
  { label: "Semi Oval", hint: "Balanced feel" },
  { label: "Oval", hint: "Locks the top hand" },
];

export const BAT_TOES: BatOption[] = [
  { label: "Round", hint: "Traditional curved toe", picture: siteImage("bat-options/toe-round") },
  { label: "Semi Round", hint: "Flat end, rounded corners", picture: siteImage("bat-options/toe-semi-round") },
  { label: "Flat", hint: "Square, more wood low", picture: siteImage("bat-options/toe-flat") },
];

export const ENGRAVING_MAX = 15;

/** A bat's configuration: indices into BAT_WEIGHTS, BAT_PROFILES, BAT_TOES and BAT_HANDLES, and the size's code. */
export interface BatConfig {
  weight: number;
  profile: number;
  toe: number;
  handle: number;
  /** Engraving text, as typed. */
  name: string;
  knock: boolean;
  scuff: boolean;
  /** A size code the bat is sold in, e.g. "SH". */
  size: string;
}

/** The standard build: balanced weight, Duckbill profile, semi-round toe, oval handle, knocked, scuff sheet, SH. */
export const DEFAULT_BAT_CONFIG: BatConfig = {
  weight: 1,
  profile: 0,
  toe: 1,
  handle: 2,
  name: "",
  knock: true,
  scuff: true,
  size: DEFAULT_BAT_SIZE,
};

/** Right / left hand choice for pads and gloves. */
export const HANDS = ["Right hand", "Left hand"] as const;
export type Hand = (typeof HANDS)[number];
