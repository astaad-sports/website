# Astaad Sports

The Astaad Sports storefront — premium cricket gear for players who never settle. Next.js 16 (App Router), Tailwind CSS v4 and shadcn/ui, styled with the Astaad Sports design system.

## Getting started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) for the home page, [http://localhost:3000/bats/run-machine](http://localhost:3000/bats/run-machine) for a product page, and [http://localhost:3000/design-system](http://localhost:3000/design-system) for the live token and component reference.

## Storefront

The home page and the six English Willow product pages (`/bats/<slug>`) implement the Astaad Sports homepage and product-page design; the four gear category pages (`/shop/batting-pads`, `/shop/batting-gloves`, `/shop/helmets`, `/shop/cricket-kitbags`) and the gear product pages (`/shop/<category>/<slug>`) follow the same language. Their sections live in [`src/components/storefront`](src/components/storefront); the catalogue data (categories, bats, gear, kit items, sizes, configurator options) is in [`src/lib/catalogue.ts`](src/lib/catalogue.ts), and the product images in `public/images`. Gear models marked `placeholder` in the catalogue stand in for the real range. Sign-in, the cart, checkout with Razorpay and order history are live (see [Backend](#backend) and [Orders](#orders)); the wishlist is wired to buttons but has no backend yet, and the support, legal, Kashmir Willow and Tennis bat links point at routes that do not exist yet.

## Backend

Postgres on [Neon](https://neon.com), queried with [Drizzle ORM](https://orm.drizzle.team), and [Firebase Authentication](https://firebase.google.com/docs/auth) for sign-in.

- **Database**: the schema is [`src/db/schema.ts`](src/db/schema.ts) and the pooled client is `getDb()` in [`src/db/index.ts`](src/db/index.ts). It uses node-postgres over TCP, which Neon recommends for Node servers and Vercel. Migrations are SQL files in [`drizzle/`](drizzle); commit them.
- **Auth**: the browser signs in with Firebase (Google or email and password) at `/login`. The ID token then goes to a Server Action that swaps it for a two-week httpOnly `astaad_session` cookie and records the customer in the `users` table. The browser keeps no Firebase session of its own.
- **Reading the session**: in server code, call `getCurrentUser()` or `requireUser(path)` from [`src/lib/auth/session.ts`](src/lib/auth/session.ts). Both verify the cookie with Firebase Admin, including revoked and disabled accounts. `/account` shows the pattern.
- Orders and addresses should reference `users.id`, not the Firebase UID, so the store never depends on the auth provider.

### Orders

- **Cart**: kept in the browser's localStorage by [`src/components/cart/use-cart.ts`](src/components/cart/use-cart.ts). It stores choices only (product, size, weight, engraving and so on), never prices. Every Add to cart button uses `AddToCartButton`; the header shows the live count.
- **Pricing**: [`src/lib/cart.ts`](src/lib/cart.ts) validates each item against the catalogue and prices it. The cart page and the server use the same code, and the server always reprices, so a tampered browser cannot change what is charged. Customisation and delivery are free.
- **Checkout** (`/checkout`, sign-in required): the customer enters a delivery address, validated by [`src/lib/checkout.ts`](src/lib/checkout.ts). The `placeOrder` Server Action saves a `pending_payment` order with its items, creates a Razorpay order for the total, and opens Razorpay Checkout.
- **Payment**: when Razorpay returns, `confirmPayment` checks the payment signature and marks the order `paid`. The `order.paid` webhook at `/api/webhooks/razorpay` does the same if the customer closes the tab first. Both are safe to run twice.
- **Order history**: `/account` lists paid orders and `/account/orders/<number>` shows one, which is also the confirmation page after paying. Orders are numbered from AST-10001, and money is stored in paise.
- Keep **automatic capture** on in Razorpay (Account & Settings, Payment capture). The store treats a verified payment as paid and has no manual capture step.
- Not built yet: cash on delivery, stock levels, order emails, and moving orders to shipped or delivered.

### First-time setup

1. Copy the env template: `cp .env.example .env.local`.
2. **Neon**: create a project in the Singapore region (closest to India). From the Connect dialog, put the pooled connection string in `DATABASE_URL` and the direct one in `DATABASE_URL_UNPOOLED`. Change `sslmode=require` to `sslmode=verify-full`.
3. **Firebase**: create a project and add a Web app. Copy its config into the `NEXT_PUBLIC_FIREBASE_*` values.
4. In Firebase, open Authentication, then Sign-in method, and enable **Email/Password** and **Google**.
5. In Project settings, open Service accounts and generate a private key. Copy `client_email` and `private_key` from the JSON into `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. Keep the key out of git.
6. Start the app with `bun run dev`. It applies any pending migrations first, which creates the tables on the first run.
7. **Razorpay**: create test API keys and put them in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Until they are set, checkout shows that online payment is not set up.
8. Before going live, switch to live Razorpay keys, add the `order.paid` webhook with `RAZORPAY_WEBHOOK_SECRET`, and add the production domain under Authentication, then Settings, then Authorized domains. Set the same env values on the host, such as Vercel project settings, and run `bun run db:migrate` against production before deploying schema changes.

### Changing the schema

Edit [`src/db/schema.ts`](src/db/schema.ts), run `bun run db:generate` to write a migration, and review the SQL in `drizzle/`. The next `bun run dev` applies it, or run `bun run db:migrate` to apply it straight away.

### Local auth without Firebase

The [Firebase Auth emulator](https://firebase.google.com/docs/emulator-suite) runs sign-in offline with fake accounts. It needs Java. Start it with `npx firebase-tools emulators:start --only auth --project demo-astaad`. Then uncomment the two `*_AUTH_EMULATOR_HOST` lines in `.env.local`, set `NEXT_PUBLIC_FIREBASE_PROJECT_ID="demo-astaad"`, and give `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` any placeholder value. The service account values are not needed.

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
| `bun run dev` | Apply pending migrations, then start the dev server. Migrations are skipped until `DATABASE_URL` is set; a failed migration stops the start. |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run lint` | ESLint |
| `bun run db:generate` | Write a SQL migration from changes to `src/db/schema.ts` |
| `bun run db:migrate` | Apply pending migrations to `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`) with [`scripts/migrate.ts`](scripts/migrate.ts); fails if neither is set |
| `bun run db:studio` | Browse the database in Drizzle Studio |
| `bun run test` | Unit tests for cart pricing, checkout validation and Razorpay signatures (`bun test`) |
