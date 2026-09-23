import Link from "next/link";

import {
  BottomTabBar,
  CATEGORIES,
  CategoryChip,
  Crest,
  Icon,
  NavBar,
  ProductCard,
  PromoBanner,
  TRUST_CLAIMS,
  TrustBadge,
  type Category,
} from "@/components/astaad";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

const CATEGORY_HREFS: Record<Category, string> = {
  Bats: "/shop/bats",
  "Batting Pads": "/shop/batting-pads",
  "Batting Gloves": "/shop/batting-gloves",
  Helmets: "/shop/helmets",
  "Cricket Kitbags": "/shop/cricket-kitbags",
};

const NAV_LINKS = [
  { label: "Home", href: "/", active: true },
  { label: "Shop", href: "/shop" },
  ...CATEGORIES.map((category) => ({
    label: category,
    href: CATEGORY_HREFS[category],
  })),
  { label: "About", href: "/about" },
];

// One product per category, as the home page grid shows.
const FEATURED = [
  {
    line: "Astaad EW Pro 100",
    name: "English Willow Cricket Bat",
    price: 28999,
    rating: 4.8,
    reviewCount: 124,
    badge: "Bestseller",
    href: "/shop/bats/astaad-ew-pro-100",
  },
  {
    line: "Astaad Pro",
    name: "Batting Pads",
    price: 6499,
    rating: 4.7,
    reviewCount: 73,
    href: "/shop/batting-pads/astaad-pro",
  },
  {
    line: "Astaad Elite",
    name: "Batting Gloves",
    price: 4999,
    rating: 4.6,
    reviewCount: 89,
    badge: "New",
    href: "/shop/batting-gloves/astaad-elite",
  },
  {
    line: "Astaad Club",
    name: "Cricket Helmet",
    price: 6999,
    rating: 4.7,
    reviewCount: 61,
    href: "/shop/helmets/astaad-club",
  },
  {
    line: "Astaad Pro",
    name: "Cricket Kitbag",
    price: 5499,
    rating: 4.5,
    reviewCount: 38,
    href: "/shop/cricket-kitbags/astaad-pro",
  },
];

export default function Home() {
  return (
    <>
      <NavBar links={NAV_LINKS} cartCount={3} />

      <main className="flex-1 pb-16 md:pb-0">
        {/* Hero — the stage: dark, floodlit, confident */}
        <section className="bg-surface-dark text-on-dark">
          <div className="page-shell relative flex flex-col items-start gap-6 py-10 md:py-16 lg:min-h-[520px] lg:justify-center">
            <span className="type-eyebrow text-on-dark-muted">
              Cricket gear for
            </span>
            <h1 className="type-display-xl lg:type-display-hero">
              Bigger
              <br />
              <span className="text-brand-yellow">Innings</span>
            </h1>
            <p className="type-body-lg max-w-md text-on-dark-muted">
              Premium cricket gear for players who never settle.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                render={<Link href="/shop" />}
                nativeButton={false}
              >
                Shop Now
                <Icon name="arrow-right" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="border-on-dark text-on-dark hover:bg-surface-dark-raised"
                render={<Link href={CATEGORY_HREFS.Bats} />}
                nativeButton={false}
              >
                Explore Bats
              </Button>
            </div>
            <span
              aria-hidden="true"
              className="type-script-accent absolute right-10 bottom-12 hidden -rotate-6 text-on-dark-muted lg:block"
            >
              Built for Greatness
            </span>
          </div>
          <div className="border-t border-border-on-dark">
            <div className="page-shell flex flex-wrap gap-x-10 gap-y-4 py-5">
              {TRUST_CLAIMS.map((claim) => (
                <TrustBadge key={claim.title} {...claim} />
              ))}
            </div>
          </div>
        </section>

        {/* Shop by Category — the five circular tiles */}
        <section className="page-shell py-8 md:py-16">
          <h2 className="type-heading-md md:type-heading-xl mb-6">
            Shop by Category
          </h2>
          <div className="grid grid-cols-3 justify-items-center gap-3 md:flex md:flex-wrap md:justify-between md:gap-5">
            {CATEGORIES.map((category) => (
              <CategoryChip
                key={category}
                label={category}
                href={CATEGORY_HREFS[category]}
                size="responsive"
              />
            ))}
          </div>
        </section>

        {/* Featured Products — one per category */}
        <section className="page-shell pb-8 md:pb-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="type-heading-md md:type-heading-xl">
                Featured Products
              </h2>
              <p className="type-body-sm mt-1 text-ink-muted">
                Top picks for your next innings.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/shop" />}
              nativeButton={false}
            >
              View All
              <Icon name="arrow-right" className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-5">
            {FEATURED.map((product) => (
              <ProductCard
                key={product.href}
                {...product}
                price={formatPrice(product.price)}
              />
            ))}
          </div>
        </section>

        {/* Promo tiles — dark / light / dark */}
        <section className="page-shell pb-8 md:pb-16">
          <div className="grid gap-4 md:grid-cols-3">
            <PromoBanner
              eyebrow="Gear up"
              title="Like a"
              emphasis="Pro"
              cta="Explore Bats"
              href={CATEGORY_HREFS.Bats}
            />
            <PromoBanner
              tone="light"
              eyebrow="Small"
              title="Details"
              emphasis="Big Impact"
              cta="Shop Batting Gloves"
              href={CATEGORY_HREFS["Batting Gloves"]}
            />
            <PromoBanner
              eyebrow="Carry it all"
              title="Kitted"
              emphasis="Out"
              cta="Shop Kitbags"
              href={CATEGORY_HREFS["Cricket Kitbags"]}
            />
          </div>
        </section>
      </main>

      {/* Footer — back on the stage */}
      <footer className="bg-surface-dark text-on-dark">
        <div className="page-shell grid gap-10 py-10 md:grid-cols-[1.5fr_1fr_1fr] md:py-16">
          <div className="flex flex-col items-start gap-4">
            <Crest size={48} />
            <p className="type-body max-w-xs text-on-dark-muted">
              Same passion. Higher standards. Premium cricket equipment for
              players across India.
            </p>
          </div>
          <div>
            <h3 className="type-heading-sm mb-4">Shop</h3>
            <ul className="flex flex-col gap-2">
              {CATEGORIES.map((category) => (
                <li key={category}>
                  <Link
                    href={CATEGORY_HREFS[category]}
                    className="type-body-sm text-on-dark-muted hover:text-on-dark"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="type-heading-sm mb-4">Astaad Sports</h3>
            <ul className="flex flex-col gap-2">
              {[
                ["About", "/about"],
                ["Size Guide", "/size-guide"],
                ["Returns", "/returns"],
                ["Contact", "/contact"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="type-body-sm text-on-dark-muted hover:text-on-dark"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-border-on-dark">
          <div className="page-shell flex flex-wrap items-center justify-between gap-2 py-4">
            <span className="type-caption text-on-dark-muted">
              © {new Date().getFullYear()} Astaad Sports. All rights reserved.
            </span>
            <Link
              href="/design-system"
              className="type-caption text-on-dark-muted hover:text-on-dark"
            >
              Design system
            </Link>
          </div>
        </div>
      </footer>

      <BottomTabBar
        defaultActive="home"
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      />
    </>
  );
}
