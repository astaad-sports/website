# Astaad Sports

The Astaad Sports storefront — premium cricket gear for players who never settle. Next.js 16 (App Router), Tailwind CSS v4 and shadcn/ui, styled with the Astaad Sports design system.

## Getting started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) for the home page, [http://localhost:3000/bats/run-machine](http://localhost:3000/bats/run-machine) for a product page, and [http://localhost:3000/design-system](http://localhost:3000/design-system) for the live token and component reference.

## Storefront

The home page and the six English Willow product pages (`/bats/<slug>`) implement the Astaad Sports homepage and product-page design. Their sections live in [`src/components/storefront`](src/components/storefront); the catalogue data (categories, bats, kit items, sizes, configurator options) is in [`src/lib/catalogue.ts`](src/lib/catalogue.ts), and the product images in `public/images`. Cart, wishlist and account actions are wired to buttons but have no backend yet, and the category and support links point at routes that do not exist yet.

## Design system

The brand book, tokens and component guidelines are in [`src/components/astaad/README.md`](src/components/astaad/README.md).

- Tokens (colour, type, radius, elevation): [`src/app/globals.css`](src/app/globals.css)
- Fonts (Inter, Montserrat, Caveat via `next/font`): [`src/app/layout.tsx`](src/app/layout.tsx)
- Primitives (shadcn/ui, themed): [`src/components/ui`](src/components/ui) — add more with `bunx --bun shadcn@latest add <component>`
- Composite components: [`src/components/astaad`](src/components/astaad)
- Formatting helpers (`formatPrice`, `formatRating`): [`src/lib/format.ts`](src/lib/format.ts)

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run lint` | ESLint |
