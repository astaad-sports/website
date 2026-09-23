// Storefront catalogue for the Astaad Sports home and product pages.
// Prices are rupees; format them with `formatPrice`.

export interface StoreCategory {
  slug: string;
  name: string;
  href: string;
  number: string;
  from: number;
  models?: number;
  image: string;
  /** Placement inside the 280px category tile. */
  tile: { width: number; height: number; top: number; shadowWidth: number; shadowTop: number };
}

export const STORE_CATEGORIES: StoreCategory[] = [
  {
    slug: "bats",
    name: "Bats",
    href: "/#collection",
    number: "01",
    from: 7699,
    models: 10,
    image: "/images/category-bats.png",
    tile: { width: 224, height: 158, top: 44, shadowWidth: 200, shadowTop: 150 },
  },
  {
    slug: "batting-pads",
    name: "Batting Pads",
    href: "/shop/batting-pads",
    number: "02",
    from: 5499,
    image: "/images/batting-pads.png",
    tile: { width: 140, height: 160, top: 28, shadowWidth: 160, shadowTop: 168 },
  },
  {
    slug: "batting-gloves",
    name: "Batting Gloves",
    href: "/shop/batting-gloves",
    number: "03",
    from: 4999,
    image: "/images/batting-gloves.png",
    tile: { width: 170, height: 158, top: 32, shadowWidth: 180, shadowTop: 168 },
  },
  {
    slug: "helmets",
    name: "Helmets",
    href: "/shop/helmets",
    number: "04",
    from: 6999,
    image: "/images/helmet.png",
    tile: { width: 156, height: 160, top: 34, shadowWidth: 170, shadowTop: 168 },
  },
  {
    slug: "cricket-kitbags",
    name: "Cricket Kitbags",
    href: "/shop/cricket-kitbags",
    number: "05",
    from: 3499,
    image: "/images/kitbag.png",
    tile: { width: 236, height: 144, top: 48, shadowWidth: 210, shadowTop: 168 },
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
  /** The Black Edition sits on a dark plate with a darkened blade. */
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
    dark: true,
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

export interface KitItem {
  slug: string;
  category: string;
  name: string;
  note?: string;
  price: number;
  mrp?: number;
  image: string;
  imageWidth: number;
  imageHeight: number;
  imageTop: number;
}

/** Gloves, pads, helmet and kitbag: the "complete your kit" row. */
export const KIT_ITEMS: KitItem[] = [
  {
    slug: "elite-batting-gloves",
    category: "Batting Gloves",
    name: "Elite Batting Gloves",
    note: "Pro sheepskin palm",
    price: 4999,
    image: "/images/batting-gloves.png",
    imageWidth: 192,
    imageHeight: 178,
    imageTop: 56,
  },
  {
    slug: "pro-batting-pads",
    category: "Batting Pads",
    name: "Pro Batting Pads",
    price: 5499,
    image: "/images/batting-pads.png",
    imageWidth: 160,
    imageHeight: 184,
    imageTop: 48,
  },
  {
    slug: "club-cricket-helmet",
    category: "Helmet",
    name: "Club Cricket Helmet",
    note: "Steel grille · adjustable",
    price: 6999,
    image: "/images/helmet.png",
    imageWidth: 168,
    imageHeight: 176,
    imageTop: 60,
  },
  {
    slug: "pro-cricket-kitbag",
    category: "Cricket Kitbag",
    name: "Pro Cricket Kitbag",
    note: "Wheelie · full kit",
    price: 3499,
    image: "/images/kitbag.png",
    imageWidth: 248,
    imageHeight: 150,
    imageTop: 84,
  },
];

/** The home page "What players are buying" row. */
export const BESTSELLERS: (KitItem & { badge?: string; href?: string })[] = [
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
  /** Silhouette height in the size picker, relative to Long Handle. */
  scale: number;
  longHandle?: boolean;
}

export const BAT_SIZES: BatSize[] = [
  { code: "6", label: "Size 6", age: "10–12 years", height: "4'6\" – 5'0\"", length: "31.5\"", scale: 0.8 },
  { code: "H", label: "H / Harrow", age: "12–14 years", height: "5'0\" – 5'4\"", length: "32.75\"", scale: 0.89 },
  { code: "SH", label: "SH / Full Size", age: "15+ years", height: "5'4\" – 5'10\"", length: "33.5\"", scale: 1 },
  { code: "LH", label: "LH / Long Handle", age: "15+ years", height: "5'10\"+", length: "34.5\"", scale: 1, longHandle: true },
];

export interface BatOption {
  label: string;
  hint: string;
}

export const BAT_WEIGHTS: BatOption[] = [
  { label: "1120–1150 g", hint: "Light · quick hands" },
  { label: "1150–1180 g", hint: "Balanced · most players" },
  { label: "1180–1220 g", hint: "Heavy · power hitters" },
];

export const BAT_PROFILES: BatOption[] = [
  { label: "Duckbill Players", hint: "Low swell, big toe" },
  { label: "Mid to Low", hint: "All-round middle" },
  { label: "Full Spine", hint: "Max wood, high spine" },
];

export const BAT_HANDLES: BatOption[] = [
  { label: "Round", hint: "Classic grip" },
  { label: "Semi Oval", hint: "Balanced feel" },
  { label: "Oval", hint: "Locks the top hand" },
];

export const ENGRAVING_MAX = 15;
