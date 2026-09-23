import type { Metadata } from "next";

import {
  BottomTabBar,
  CATEGORIES,
  CartLineItem,
  CategoryChip,
  CHECKOUT_TRUST_CLAIM,
  Crest,
  Icon,
  IconButton,
  NavBar,
  PriceRating,
  ProductCard,
  PromoBanner,
  SearchInput,
  SizeSelector,
  TRUST_CLAIMS,
  TrustBadge,
} from "@/components/astaad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";

import { ThemeToggle } from "./theme-toggle";

export const metadata: Metadata = {
  title: "Design system",
  description: "Astaad Sports tokens, type styles and components.",
};

const COLOUR_GROUPS: { title: string; tokens: [string, string][] }[] = [
  {
    title: "Brand",
    tokens: [
      ["brand-yellow", "The one accent: primary buttons, active nav, badges, ratings."],
      ["brand-yellow-hover", "Primary button hover and pressed fill."],
      ["brand-gold", "The crest gold. Logo, print and packaging only."],
      ["brand-ink", "The crest black. Logo lockups and print."],
    ],
  },
  {
    title: "Ink",
    tokens: [
      ["ink", "Headlines, product names, prices, primary body copy."],
      ["ink-muted", "Subtitles, review counts, size hints, placeholders."],
      ["ink-subtle", "Tertiary labels at 24px+ or bold 19px+ only."],
      ["on-yellow", "Text and icons on brand-yellow."],
      ["on-dark", "Text on surface-dark in either theme."],
      ["on-dark-muted", "Secondary copy on surface-dark."],
    ],
  },
  {
    title: "Surfaces",
    tokens: [
      ["surface", "Page background."],
      ["surface-raised", "Cards, cart panels, sheets, modals."],
      ["surface-sunken", "Table headers, chip backgrounds, filter bars."],
      ["surface-circle", "The round category tile."],
      ["surface-dark", "Nav bar, hero, promo banners, footer — every theme."],
      ["surface-dark-raised", "Search field and icon buttons on surface-dark."],
    ],
  },
  {
    title: "Borders, focus, states",
    tokens: [
      ["border", "Card outlines, dividers, table rules."],
      ["border-strong", "Selected size cell, secondary button, active tab."],
      ["border-on-dark", "Search outline and dividers on surface-dark."],
      ["focus", "2px solid focus ring, 2px offset."],
      ["rating", "Star icon fill only."],
      ["success", "In stock, order confirmed. Always with a word."],
      ["danger", "Out of stock, remove, form errors. Always with a word or icon."],
      ["cricket-ball", "Photography accent only. Never a UI state."],
    ],
  },
];

const TYPE_STYLES: [string, string][] = [
  ["type-display-hero", "Bigger innings"],
  ["type-display-xl", "Play belong grow"],
  ["type-display-lg", "Astaad bats"],
  ["type-display-md", "Gear up like a pro"],
  ["type-heading-xl", "Featured Products"],
  ["type-heading-lg", "Astaad EW Pro 100"],
  ["type-heading-md", "Shop by Category"],
  ["type-heading-sm", "Order Summary"],
  ["type-body-lg", "Premium cricket equipment for players who play with passion."],
  ["type-body", "Premium Grade 1 English Willow for superior power, balance and control."],
  ["type-body-sm", "Fast Delivery Across India"],
  ["type-caption", "Home"],
  ["type-eyebrow", "Cricket gear for"],
  ["type-price-lg", "₹ 28,999"],
  ["type-price", "₹ 4,999"],
  ["type-label", "Add to Cart"],
  ["type-badge", "Bestseller"],
  ["type-script-accent", "Built for Greatness"],
];

const SPACING = ["1", "2", "3", "4", "5", "6", "8", "10", "16"];
const RADII = ["sm", "md", "lg", "full"];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="type-heading-lg">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ token, note }: { token: string; note: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="size-12 shrink-0 rounded-md border border-border"
        style={{ background: `var(--${token})` }}
      />
      <div className="min-w-0">
        <code className="type-label block">{token}</code>
        <p className="type-body-sm text-ink-muted">{note}</p>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <>
      <NavBar
        links={[
          { label: "Home", href: "/" },
          { label: "Design system", href: "/design-system", active: true },
        ]}
        cartCount={3}
        search={false}
      />
      <main className="page-shell flex flex-1 flex-col gap-16 py-10 md:py-16">
        <header className="flex flex-col items-start gap-4">
          <span className="type-eyebrow text-ink-muted">Astaad Sports</span>
          <h1 className="type-display-lg md:type-display-xl">Design system</h1>
          <p className="type-body-lg max-w-2xl text-ink-muted">
            Black, white and one loud yellow, with a gold-and-black lion crest.
            A stadium at night on the hero and navigation; a clean pro shop
            everywhere products are browsed and bought.
          </p>
          <ThemeToggle />
        </header>

        <Section title="Colour">
          <div className="grid gap-10 md:grid-cols-2">
            {COLOUR_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-4">
                <h3 className="type-heading-sm text-ink-muted">{group.title}</h3>
                {group.tokens.map(([token, note]) => (
                  <Swatch key={token} token={token} note={note} />
                ))}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type">
          <div className="flex flex-col divide-y divide-border">
            {TYPE_STYLES.map(([cls, sample]) => (
              <div
                key={cls}
                className="grid gap-2 py-4 md:grid-cols-[200px_1fr] md:items-baseline"
              >
                <code className="type-body-sm text-ink-muted">{cls}</code>
                <p className={`${cls} truncate`}>{sample}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Spacing, radius and elevation">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="flex flex-col gap-3">
              <h3 className="type-heading-sm text-ink-muted">4px scale</h3>
              {SPACING.map((step) => (
                <div key={step} className="flex items-center gap-3">
                  <code className="type-body-sm w-16 text-ink-muted">space-{step}</code>
                  <span
                    className="h-3 bg-brand-yellow"
                    style={{ width: `${Number(step) * 4}px` }}
                  />
                  <span className="type-body-sm text-ink-muted">{Number(step) * 4}px</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="type-heading-sm text-ink-muted">Radius</h3>
              <div className="flex flex-wrap gap-4">
                {RADII.map((r) => (
                  <div key={r} className="flex flex-col items-center gap-2">
                    <span className={`size-16 border-[1.5px] border-border-strong rounded-${r}`} />
                    <code className="type-body-sm text-ink-muted">rounded-{r}</code>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="type-heading-sm text-ink-muted">Elevation</h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex h-20 w-32 items-center justify-center rounded-md border border-border bg-surface-raised shadow-card">
                  <code className="type-body-sm">shadow-card</code>
                </div>
                <div className="flex h-20 w-32 items-center justify-center rounded-md border border-border bg-surface-raised shadow-float">
                  <code className="type-body-sm">shadow-float</code>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Logo">
          <div className="flex flex-wrap items-center gap-10">
            <Crest size={96} />
            <div className="rounded-md bg-surface-dark p-6">
              <Crest size={96} />
            </div>
            <p className="type-body-sm max-w-sm text-ink-muted">
              Use the crest as supplied at 40px or taller with clear space of a
              quarter of its height. It carries its own black shield, so it sits
              directly on white and on black.
            </p>
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap items-center gap-4">
            <Button>
              Shop Now
              <Icon name="arrow-right" />
            </Button>
            <Button size="sm">
              <Icon name="cart" className="size-4" />
              Add to Cart
            </Button>
            <Button variant="secondary">Explore Bats</Button>
            <Button variant="ghost">View All</Button>
            <Button size="lg">
              Proceed to Checkout
              <Icon name="arrow-right" />
            </Button>
            <Button disabled>Out of Stock</Button>
          </div>
        </Section>

        <Section title="Badge">
          <div className="flex flex-wrap items-center gap-4">
            <Badge>Bestseller</Badge>
            <Badge>New</Badge>
            <Badge variant="dark">Limited</Badge>
            <span className="rounded-md bg-surface-dark p-2">
              <Badge size="count">3</Badge>
            </span>
          </div>
        </Section>

        <Section title="Icon button">
          <div className="flex flex-wrap items-center gap-4">
            <IconButton icon="heart" label="Save" />
            <IconButton icon="heart" label="Saved" filled pressed />
            <IconButton icon="search" label="Search" />
            <span className="rounded-full bg-surface-dark p-1">
              <IconButton icon="cart" label="Cart" count={3} onDark />
            </span>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-xl gap-3">
            <Input placeholder="Full name" aria-label="Full name" />
            <SearchInput />
            <div className="rounded-md bg-surface-dark p-3">
              <SearchInput onDark />
            </div>
          </div>
        </Section>

        <Section title="Price and rating">
          <div className="grid max-w-[260px] gap-3">
            <PriceRating price={formatPrice(28999)} rating={4.8} count={124} />
            <PriceRating price={formatPrice(4999)} rating={4.6} count={89} />
            <PriceRating
              price={formatPrice(28999)}
              rating={4.8}
              count={124}
              reviews
              size="lg"
            />
          </div>
        </Section>

        <Section title="Product card">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:max-w-4xl">
            <ProductCard
              line="Astaad Pro"
              name="English Willow Cricket Bat"
              price={formatPrice(28999)}
              rating={4.8}
              reviewCount={124}
              badge="Bestseller"
            />
            <ProductCard
              line="Astaad Elite"
              name="Batting Gloves"
              price={formatPrice(4999)}
              rating={4.6}
              reviewCount={89}
              badge="New"
              saved
            />
            <ProductCard
              line="Astaad Club"
              name="Cricket Helmet"
              price={formatPrice(6999)}
              rating={4.7}
              reviewCount={61}
            />
          </div>
        </Section>

        <Section title="Category chip">
          <div className="flex flex-wrap items-end gap-5">
            {CATEGORIES.map((category) => (
              <CategoryChip key={category} label={category} />
            ))}
            <CategoryChip label="Bats" size="sm" />
          </div>
        </Section>

        <Section title="Promo banner">
          <div className="grid gap-4 md:grid-cols-3">
            <PromoBanner eyebrow="Gear up" title="Like a" emphasis="Pro" cta="Explore Bats" />
            <PromoBanner
              tone="light"
              eyebrow="Small"
              title="Details"
              emphasis="Big Impact"
              cta="Shop Batting Gloves"
            />
            <PromoBanner eyebrow="Carry it all" title="Kitted" emphasis="Out" cta="Shop Kitbags" />
          </div>
        </Section>

        <Section title="Trust badge">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-8 rounded-md bg-surface-dark p-4 text-on-dark">
              {TRUST_CLAIMS.map((claim) => (
                <TrustBadge key={claim.title} {...claim} />
              ))}
            </div>
            <div className="flex flex-wrap justify-around gap-6">
              {[TRUST_CLAIMS[1], TRUST_CLAIMS[2], CHECKOUT_TRUST_CLAIM].map(
                (claim) => (
                  <TrustBadge key={claim.title} layout="stack" {...claim} />
                )
              )}
            </div>
          </div>
        </Section>

        <Section title="Size selector">
          <SizeSelector
            defaultValue="SH"
            guideHref="/size-guide"
            sizes={[
              { value: "6" },
              { value: "H", hint: "(Harrow)" },
              { value: "SH", hint: "(Full Size)" },
              { value: "LH", hint: "(Long Handle)" },
              { value: "XL", hint: "Sold out", disabled: true },
            ]}
          />
        </Section>

        <Section title="Cart line item">
          <CartLineItem
            name="Astaad EW Pro 100"
            meta="Size: SH (Full Size)"
            price={formatPrice(28999)}
          />
        </Section>

        <Section title="Bottom tab bar">
          <div className="max-w-[420px] overflow-hidden rounded-md border border-border">
            <BottomTabBar defaultActive="home" />
          </div>
        </Section>

        <Section title="Card">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="type-body text-ink-muted">Subtotal</span>
                <span className="type-price">{formatPrice(33998)}</span>
              </div>
              <div className="flex justify-between">
                <span className="type-body text-ink-muted">Shipping</span>
                <span className="type-body text-success">Free shipping</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="type-heading-sm">Total</span>
                <span className="type-price-lg">{formatPrice(33998)}</span>
              </div>
              <Button size="lg" className="mt-2 w-full">
                Proceed to Checkout
                <Icon name="arrow-right" />
              </Button>
            </CardContent>
          </Card>
        </Section>
      </main>
    </>
  );
}
