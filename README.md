# Astaad Sports

The Astaad Sports storefront — premium cricket gear for players who never settle. Next.js 16 (App Router), Tailwind CSS v4 and shadcn/ui, styled with the Astaad Sports design system.

## Getting started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) for the home page, [http://localhost:3000/bats/run-machine](http://localhost:3000/bats/run-machine) for a product page, and [http://localhost:3000/design-system](http://localhost:3000/design-system) for the live token and component reference.

## Storefront

The home page and the six English Willow product pages (`/bats/<slug>`) implement the Astaad Sports homepage and product-page design; the four gear category pages (`/shop/batting-pads`, `/shop/batting-gloves`, `/shop/helmets`, `/shop/cricket-kitbags`) and the gear product pages (`/shop/<category>/<slug>`) follow the same language. Their sections live in [`src/components/storefront`](src/components/storefront); the catalogue data (categories, bats, gear, kit items, sizes, configurator options) is in [`src/lib/catalogue.ts`](src/lib/catalogue.ts), and the product images in `public/images`. Gear models marked `placeholder` in the catalogue stand in for the real range. Sign-in, the cart, checkout with Razorpay and order history are live (see [Backend](#backend) and [Orders](#orders)); the wishlist at `/wishlist` keeps the products saved with the heart on a product plate or product page in the browser's localStorage, like the cart ([`src/components/wishlist/use-wishlist.ts`](src/components/wishlist/use-wishlist.ts)); the support, legal, Kashmir Willow and Tennis bat links point at routes that do not exist yet.

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
- **Payment**: when Razorpay returns, `confirmPayment` checks the payment signature and marks the order `paid`, and the order emails go out (see [Emails](#emails)). The `order.paid` webhook at `/api/webhooks/razorpay` does the same if the customer closes the tab first. Both are safe to run twice. The same webhook takes `refund.processed`, which emails the customer once a refund is made.
- **Order history**: `/account` lists paid orders and `/account/orders/<number>` shows one, which is also the confirmation page after paying. Orders are numbered from AST-10001, and money is stored in paise.
- Keep **automatic capture** on in Razorpay (Account & Settings, Payment capture). The store treats a verified payment as paid and has no manual capture step.
- **Test accounts**: sign up on `/login` with any email and add it to `TEST_ACCOUNT_EMAILS`. That account shops, applies offers and pays like a customer, but its orders are test orders: Razorpay opens in test mode (pay with the UPI ID `success@razorpay`), stock is never taken, and the admin lists them only under the **Test** filter in `/admin/orders`, marked not to ship. Test orders use `RAZORPAY_TEST_KEY_ID` and `RAZORPAY_TEST_KEY_SECRET`, or the main keys while those are test keys; they never use live keys, and a test payment can never mark a real order paid.
- **Sizes and stock**: each product is sold in the sizes ticked for it in the admin's product editor (and, for pads and gloves, left and right hand), from the lists in [`src/lib/catalogue.ts`](src/lib/catalogue.ts). Each size and hand has its own stock count, set in the editor or on `/admin/inventory`: `products.variant_stock` holds them and `products.stock` their total. The store strikes through a size with none left, and a paid order takes each item from the size and hand that was bought (`order_items.variant`). A bat's sizes can each have a price and MRP of their own (`products.size_prices`, under Pricing in the editor); a size without one sells at the bat's price, and the cart charges the price of the size chosen. The rules are in [`src/lib/products/variants.ts`](src/lib/products/variants.ts).
- Not built yet: cash on delivery.

#### Emails

Order emails go out through [Resend](https://resend.com), from [`src/lib/email`](src/lib/email):

| When | Email |
| --- | --- |
| An order is paid (on the checkout page or by the webhook) | **Order confirmation** to the customer, and a **new order alert** to every address in `ADMIN_EMAILS`, listing any of its products now low or out of stock |
| It moves on to Packed | **Packed update** to the customer |
| It ships: a tracking ID is saved, or the status moves on to Shipped | **Shipping update** to the customer, with the courier and tracking ID |
| The courier or tracking ID is corrected while it is shipped | **Tracking update** to the customer |
| It moves on to Delivered | **Delivery confirmation** to the customer, with a link to write a review |
| The admin cancels it (**Cancel order** on the order page, until it is delivered) | **Cancellation** to the customer, with the refund amount. Its items go back in stock; the refund itself is made in the Razorpay dashboard |
| A refund is made in the Razorpay dashboard (the `refund.processed` webhook) | **Refund confirmation** to the customer, with the amount that went back. One per refund, so a part refund says its own amount |
| A checkout stopped at payment (checked once a day) | **Unpaid order alert** to every address in `ADMIN_EMAILS`: who it was, how to reach them and what they wanted |
| A customer sends a review from `/reviews/write` | **New review alert** to every address in `ADMIN_EMAILS`, with a link to publish or hide it |

- Every email to the customer after the confirmation also goes to `ADMIN_EMAILS` as a hidden copy (bcc), so the admins see what the customer was told. Not while sending from Resend's test sender, which refuses an email with any address other than the Resend account's own.
- A test account's orders get the same emails, with "[Test]" before the subject.
- Each email goes at most once per order. The `order_emails` table claims it before sending, so the checkout page and the webhook, a second tap, or moving an order back and forward again never send a second copy. The Confirmed step (to the customer a paid order is already confirmed), moving an order back and removing a tracking ID send nothing.
- The unpaid order alert comes from a daily job, [`/api/cron/unpaid-orders`](src/app/api/cron/unpaid-orders/route.ts), which Vercel Cron calls at about 9 am Indian time (see [`vercel.json`](vercel.json)); it needs `CRON_SECRET`. Each press of Pay makes an order, so only a customer's last try counts: it is reported once it has waited an hour unpaid, unless they went on to pay. Test accounts' orders are left out.
- The new review alert is not tied to an order, so it is not recorded: it goes once, when the review is sent, and a failure is only logged. The review still shows under Needs attention on the admin home.
- Emails are sent after the response (Next's `after()`), so a slow or failed send never holds up a payment or an admin action.
- A failed email, or one whose send never finished, shows on its order page with Resend's reason and a **Send again** button, and under Needs attention on the admin home. The Customer section lists what the customer has been emailed.
- Each email carries an idempotency key. When Resend doesn't answer, or answers with a server error, the retry keeps the key, so if the first try did go, Resend drops the repeat (within 24 hours).
- With no `RESEND_API_KEY`, nothing is sent or recorded, and nothing fails. Settings shows whether emails are on, who they come from, how many addresses get the alerts and copies, and whether the daily unpaid-order check can run.
- Customers' replies go to the support email in Settings. Firebase still sends its own sign-up verification and password-reset emails.

### Shipping with Trackon

Trackon Couriers publishes no developer API; API access needs a Trackon business account. So parcels are booked with Trackon directly, and the store records each AWB (Trackon's consignment number).

1. Paid orders wait under **To ship** at `/admin/orders`, oldest first. Only accounts in `ADMIN_EMAILS` with a verified email can open it; everyone else gets a 404.
2. The order page lists what to pack, with every option and the engraving, and the delivery address for the consignment note.
3. Book the parcel with Trackon, enter the AWB and choose **Mark as shipped**. The customer is emailed the AWB. It can be corrected later (the customer is emailed the new one), and one AWB cannot be used on two orders.
4. The customer's order page shows the progress, the AWB with a copy button, and a link to [Trackon's tracking page](https://www.trackon.in/courier-tracking). Trackon's page does not take the AWB in its URL, so the customer pastes it. The footer's Track Order link goes to the customer's orders.
5. When Trackon delivers, choose **Mark as delivered**.

Statuses change by hand today. Automatic updates need a tracking source: Trackon's own API, or a service that tracks Trackon AWBs such as TrackingMore, AfterShip or Shipway. Carriers live in [`src/lib/shipping.ts`](src/lib/shipping.ts).

### First-time setup

1. Copy the env template: `cp .env.example .env.local`.
2. **Neon**: create a project in the Singapore region (closest to India). From the Connect dialog, put the pooled connection string in `DATABASE_URL` and the direct one in `DATABASE_URL_UNPOOLED`. Change `sslmode=require` to `sslmode=verify-full`.
3. **Firebase**: create a project and add a Web app. Copy its config into the `NEXT_PUBLIC_FIREBASE_*` values.
4. In Firebase, open Authentication, then Sign-in method, and enable **Email/Password** and **Google**.
5. In Project settings, open Service accounts and generate a private key. Copy `client_email` and `private_key` from the JSON into `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. Keep the key out of git.
6. Start the app with `bun run dev`. It applies any pending migrations first, which creates the tables on the first run.
7. **Razorpay**: create test API keys and put them in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Until they are set, checkout shows that online payment is not set up.
   Add your own email to `ADMIN_EMAILS` to ship orders from `/admin/orders`; sign in with Google or verify the email first.
8. **Resend** (order emails): create an API key with sending access and put it in `RESEND_API_KEY`. Until a domain is verified, emails come from Resend's test sender and reach only the Resend account's own address. To email customers, add the store's domain under Domains in Resend, add the DNS records it shows, and once it is verified set `EMAIL_FROM`, for example `Astaad Sports <no-reply@astaadsports.com>`. Set `SITE_URL` to the live address, such as `https://astaadsports.com`, so links in emails point there. Search engines are given the same address for every page (see step 10).
9. Before going live, switch to live Razorpay keys, add the webhook with the `order.paid` and `refund.processed` events and `RAZORPAY_WEBHOOK_SECRET`, set `CRON_SECRET` to a long random value, and add the production domain under Authentication, then Settings, then Authorized domains. Set the same env values on the host, such as Vercel project settings, and run `bun run db:migrate` against production before deploying schema changes.
10. **Google Search Console**: with `SITE_URL` set, the site serves `/sitemap.xml` and `/robots.txt`, and every public page names its canonical address. Add a Domain property for the domain, verify it with the DNS record Google shows, then submit `https://<domain>/sitemap.xml` under Sitemaps. To verify with the HTML tag instead (a URL-prefix property), put the tag's content value in `GOOGLE_SITE_VERIFICATION` and redeploy. Titles, descriptions and structured data live in [`src/lib/seo`](src/lib/seo).
11. **Google Analytics**: the Google tag loads on the live site only (not in development, on preview deploys or in the admin). The measurement ID is in [`src/lib/analytics.ts`](src/lib/analytics.ts). The privacy policy at `/privacy` names it; update that page if the tracking changes. It also reports shopping steps (product viewed, added to cart, checkout begun, order paid; see [`src/lib/analytics-events.ts`](src/lib/analytics-events.ts)), never for test orders.
12. **Google Merchant Center**: the site serves a product feed at `/feeds/google.xml`, one item for every size on sale, with the same identifiers the product pages give Google. In Merchant Center, add it as a product source by link and let Google fetch it daily; do not also keep a second source with the same products. The feed is built in [`src/lib/seo/merchant-feed.ts`](src/lib/seo/merchant-feed.ts).

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
