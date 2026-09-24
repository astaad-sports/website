# Astaad Sports design system

Astaad Sports is a cricket equipment brand and storefront: five categories only — bats, batting pads, batting gloves, helmets and cricket kitbags — sold across India. The system is black, white and one loud yellow, with a gold-and-black lion crest. It should feel like a stadium at night — dark, floodlit, confident — on the hero and navigation, and like a clean pro shop everywhere products are browsed and bought.

This folder holds the composite components. The tokens live in [`src/app/globals.css`](../../app/globals.css), the fonts in [`src/app/layout.tsx`](../../app/layout.tsx), the primitives (Button, Badge, Input, Card, Sheet, …) in [`src/components/ui`](../ui) — shadcn/ui components restyled with the Astaad tokens. A live reference of every token and component is at `/design-system`.

```tsx
import { NavBar, ProductCard, PromoBanner } from "@/components/astaad";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
```

## Content fundamentals

- Voice: short, declarative, sporting. "Play. Belong. Grow." "Same passion. Higher standards." "Built for greatness." Headlines are two to four words; subtitles are one plain sentence ("Premium cricket gear for players who never settle.").
- Address the player as *you*; the brand is *Astaad Sports* in full on first mention and in legal, footer and about copy; *Astaad* alone in product names and headlines; never *we* in headlines. Sentence case for body copy and buttons ("Add to Cart", "Proceed to Checkout", "Shop Bats"); ALL CAPS only in the `type-display-*` and `type-eyebrow` styles (the utilities apply it).
- Product naming: `Astaad <Line> <Model>` — "Astaad EW Pro 100", "Astaad Elite Batting Gloves", "Astaad Pro Cricket Kitbag". The catalogue has exactly five categories, exported as `CATEGORIES`: Bats, Batting Pads, Batting Gloves, Helmets, Cricket Kitbags. Never add categories and never shorten them to "Pads" or "Bags" in navigation.
- Prices are Indian rupees: use `formatPrice(28999)` → "₹ 28,999". Ratings use `formatRating` or `PriceRating`: "4.8 (124)" on cards, "4.8 (124 reviews)" on the product page.
- Trust claims come as the fixed triad in `TRUST_CLAIMS` (Fast Delivery Across India, 100% Genuine Products, Easy Returns Within 7 Days); checkout adds `CHECKOUT_TRUST_CLAIM` (Secure Payments).
- No emoji. No exclamation marks in UI copy.

## Colour

Every token is a CSS variable (`var(--brand-yellow)`) and a Tailwind colour (`bg-brand-yellow`, `text-ink-muted`, `border-border-strong`, `fill-rating`). The shadcn semantic names (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, `ring-ring`) resolve to the same tokens, so shadcn components come out branded.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `brand-yellow` | `#fec502` | same | The only accent: primary buttons, active nav, badges, cart count, star ratings, the highlighted hero word. Text on it is always `on-yellow`. |
| `brand-yellow-hover` | `#e6b100` | same | Primary button hover / pressed. |
| `brand-gold` / `brand-ink` | `#dfba40` / `#221f20` | same | The crest colours. Logo, print, packaging only — never UI controls. |
| `ink` | `#0e0e0e` | `#fefefe` | Headlines, product names, prices, body copy. |
| `ink-muted` | `#5f5e5e` | `#b5b3ae` | Subtitles, review counts, size hints, placeholders. |
| `ink-subtle` | `#8a8a8a` | `#7d7b76` | Large (24px+) or bold (19px+) tertiary labels only. |
| `on-yellow` | `#0e0e0e` | same | Text and icons on yellow. |
| `on-dark` / `on-dark-muted` | `#fefefe` / `#e8e6e2` | same | Text on `surface-dark`. |
| `surface` | `#fefefe` | `#0e0e0e` | Page background. |
| `surface-raised` | `#ffffff` | `#1d1d1d` | Cards, cart panels, sheets, modals. |
| `surface-sunken` | `#f5f5f5` | `#161616` | Table headers, chips, filter bars, the product image ground. |
| `surface-circle` | `#f8f8f8` | `#242424` | The round category tile. |
| `surface-dark` / `surface-dark-raised` | `#0e0e0e` / `#1d1d1d` | same | Nav bar, hero, promo tiles, footer — and the fields and icon buttons on them. |
| `border` | `#ececec` | `#2c2c2c` | Card outlines, dividers, table rules (decorative). |
| `border-strong` | `#0e0e0e` | `#fefefe` | Selected size cell, secondary button, active tab underline. |
| `border-on-dark` | `#3d4241` | same | Search outline and dividers on `surface-dark`. |
| `focus` | `#0e0e0e` | `#fec502` | The 2px focus ring (applied globally to `:focus-visible`). |
| `rating` | `#fed325` | same | Star icon fill only; the number beside it is `ink-muted`. |
| `success` | `#1a7f37` | `#4ad07a` | In stock, order confirmed. Always with a word. |
| `danger` | `#c62828` | `#ff7b72` | Out of stock, remove, form errors. Always with a word or icon. |
| `cricket-ball` | `#8b1a1a` | same | Photography and illustration only. |

Rules:

- Two grounds. `surface` is the shop; `surface-dark` is the stage (nav, hero, promo tiles, footer) and keeps its value in both themes. The dark theme (`.dark` on `<html>`) simply makes the shop dark too.
- Never tint yellow into a pale background or set yellow body text on white — it fails contrast at every size.
- `success` and `danger` always carry a word or icon; they are never badges.

## Typography

Three families, loaded with `next/font` and exposed as `font-sans` (Inter), `font-display` (Montserrat 800/900 italic) and `font-script` (Caveat 700). Each text style is one utility; responsive variants work (`type-display-xl lg:type-display-hero`). The `type-` prefix keeps them clear of Tailwind's `text-*` colour and size utilities, so class merging never drops them.

| Utility | Family | Size / line | Weight | Use |
| --- | --- | --- | --- | --- |
| `type-display-hero` | display | 88px / 0.92 | 900 italic, −0.02em, uppercase | Hero headline, one or two words per line; second line in `brand-yellow`. |
| `type-display-xl` | display | 56px / 0.95 | 900 italic, −0.02em, uppercase | Mobile hero, campaign posters. |
| `type-display-lg` | display | 32px / 1 | 900 italic, −0.01em, uppercase | Category banner titles. |
| `type-display-md` | display | 22px / 1.05 | 800 italic, uppercase | Promo tile headlines. |
| `type-heading-xl` | sans | 32px / 40px | 700, −0.02em | Storefront section titles. |
| `type-heading-lg` | sans | 24px / 32px | 700, −0.01em | Product detail title, sheet titles. |
| `type-heading-md` | sans | 18px / 24px | 600 | Mobile section titles, cart headings. |
| `type-heading-sm` | sans | 16px / 22px | 600 | Card and panel headings. |
| `type-body-lg` | sans | 18px / 26px | 400 | Hero subtitle, product description on desktop. |
| `type-body` | sans | 15px / 22px | 400 | Default body copy, table cells. |
| `type-body-sm` | sans | 13px / 18px | 400 | Card names, trust labels, review counts, helper text. |
| `type-caption` | sans | 11px / 14px | 500 | Tab labels, badge counts, size sublabels. |
| `type-eyebrow` | sans | 12px / 16px | 500, 0.28em, uppercase | Tracked eyebrow above hero and banner headlines. |
| `type-price-lg` | sans | 24px / 30px | 700 | Product detail and cart total price. |
| `type-price` | sans | 16px / 22px | 700 | Product card price. |
| `type-label` | sans | 14px / 20px | 600 | Button labels, nav links, tab labels, chip text. |
| `type-badge` | sans | 11px / 16px | 700 | Badge text. |
| `type-script-accent` | script | 40px / 1 | 700 | One handwritten tagline on photography or a hero corner. Never below 32px, at most three words. |

Hero: `type-eyebrow` in `on-dark-muted`, then the display headline in `on-dark` with the second line in `brand-yellow`, then `type-body-lg` in `on-dark-muted`, then a primary Button. Sections: `type-heading-xl` with a `type-body-sm` subtitle in `ink-muted` and a "View All" ghost button on the right.

## Spacing, radius and elevation

- Spacing is the 4px scale and maps 1:1 onto Tailwind: `space-1` = `p-1`/`gap-1` (4px) … `space-16` = `p-16` (64px). Cards pad `p-3`, buttons `py-2 px-4`, grids `gap-5` on desktop and `gap-3` on mobile, sections sit `py-16` apart on desktop. The content column is the `page-shell` utility (1440px max, `px-4` mobile / `px-6` desktop gutters).
- Radius: `rounded-sm` 6px (badges, size cells, small inputs), `rounded-md` 10px (buttons, cards, banners, search), `rounded-lg` 16px (sheets, modals, promo tiles), `rounded-full` / `rounded-pill` for pills, `rounded-full` / `rounded-circle` for category tiles, icon buttons and avatars.
- Elevation: `shadow-card` at rest (a `border` does most of the separation), `shadow-float` only on hover and overlays. No coloured left-border accents.

## Iconography

Line icons, 1.5px stroke, 20–24px, in the current text colour. The system ships no icon files; the outline set is [Lucide](https://lucide.dev), wrapped by `<Icon name="cart" />` so every icon gets the 1.5px stroke. Names: `cart`, `search`, `heart`, `user`, `home`, `grid`, `truck`, `shield`, `box`, `lock`, `trash`, `chevron`, `star`, `filter`, `menu`, `minus`, `plus`, `arrow-right`. The star is filled `rating`; the wishlist heart is outline at rest and filled `ink` when saved. Icon-only buttons are 40px circles with an accessible name (`IconButton`).

## Logo

`public/brand/astaad-crest.png` (802×649): the roaring lion on a black shield with gold flames and the ASTAAD wordmark. Render it with `<Crest size={48} />`. Use it as supplied; never recolour, outline, rotate or separate the lion from the shield. Minimum height 40px on screen, clear space of a quarter of its height on every side. It carries its own black ground, so it sits directly on white and on black. There is no wordmark-only or single-colour version: where the crest cannot be used, set ASTAAD SPORTS in `type-display-md`.

## Components

| Component | What it is | Provide |
| --- | --- | --- |
| `Button` (`ui`) | The single yellow call to action; `secondary` outline; `ghost` for "View All". 44px, `sm` 36px, `lg` 52px. | Sentence-case label, verb first. Trailing `<Icon name="arrow-right" />` only on navigation CTAs. `render={<Link href />} nativeButton={false}` for links. |
| `Badge` (`ui`) | Yellow pill for merchandising flags; `size="count"` for the cart count; `variant="dark"` on white photography. | One or two words. Not for status. |
| `Input` (`ui`) | 44px text field on `surface-raised`. | A `Label` or `aria-label`. |
| `Card` (`ui`) | `surface-raised`, `border`, `shadow-card`, `rounded-md`. | Header / content / footer slots. |
| `Sheet`, `Separator`, `RadioGroup`, `Label` (`ui`) | shadcn primitives, themed. | — |
| `Icon` | Lucide outline icon at 1.5px stroke. | `name`, a size class (`size-5`). |
| `Crest` | The logo. | `size` (≥ 40). |
| `IconButton` | 40px circular icon button; cart carries a `count`. | `icon`, `label`, `count`, `pressed`/`filled`, `onDark`. |
| `SearchInput` | Pill search field; `onDark` for the nav bar. | `placeholder`, `label`, controlled `value`/`onChange`. |
| `PriceRating` | Price left, star rating right. | Formatted `price`, `rating`, `count`, `reviews`, `size`. |
| `ProductCard` | Grid tile: cut-out, badge, wishlist heart, two-line name, price/rating, Add to Cart. | `line`, `name`, `price`, `image`, `badge`, `rating`, `reviewCount`, `href`, `onAdd`, `onSave`. Let the grid column set the width. |
| `CategoryChip` | Circular tile with the category name beneath. | `label` (one of `CATEGORIES`), `image`, `href`, `size` (`md`, `sm`, `responsive`). |
| `NavBar` | 64px black header (56px mobile with a Sheet menu). | `links` with one `active`, `cartCount`, `search`. |
| `PromoBanner` | `rounded-lg` campaign tile, dark or light. | `eyebrow`, `title`, `emphasis`, `cta`, `href`, `tone`, `image`. |
| `TrustBadge` | Icon in a ring with a two-line label. | Use `TRUST_CLAIMS`; `layout="stack"` under the checkout button. |
| `SizeSelector` | Radio group of size cells with a Size Guide link. | `sizes` (`{ value, hint, disabled }`), `value`/`onChange` or `defaultValue`, `guideHref`. |
| `CartLineItem` | Image, name, meta, price (with the regular price struck through and the offer under it during an offer), − / + stepper, trash. | `name`, `meta`, `price`, `regularPrice`, `offer`, `notice`, `image`, `qty`/`onQty` or `defaultQty`, `maxQty`, `onRemove`. Quantity never goes below 1. |
| `BottomTabBar` | Fixed mobile navigation, four tabs. | `active`/`onChange` or `defaultActive`; position it with `fixed inset-x-0 bottom-0 md:hidden`. |

Product images passed to `ProductCard`, `CategoryChip`, `PromoBanner` and `CartLineItem` go through `next/image`: local files in `public/` or static imports work as is; remote hosts need `images.remotePatterns` in `next.config.ts`.

## Layout

- Desktop: full-bleed dark nav (64px) and hero; content in `page-shell`. Category strip of the 5 circular tiles; product grid of 5 cards (one per category) or 6 from one category; a row of three promo tiles (dark / light / dark).
- Mobile: dark nav (56px) with the crest centred; "Shop by Category" 3-up circles; product grid 2-up; a fixed `BottomTabBar` with the active tab in `brand-yellow`.
- Every interactive element shows the focus ring (2px solid `focus`, 2px offset — set globally). Touch targets are 44px or taller.

## Dark theme

Add `dark` to the `<html>` class list (shadcn's convention). The storefront tokens flip; `surface-dark`, `on-dark` and `brand-yellow` stay put. No theme switcher ships with the system — the `/design-system` page has a local toggle for checking contrast.
