import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { SizeSilhouettes } from "@/components/storefront/size-guide-section";
import { SizeGuideTable } from "@/components/storefront/size-guide-table";
import {
  BAT_HANDLES,
  BAT_PROFILES,
  BAT_WEIGHTS,
  GEAR_CATEGORY_CONTENT,
  GEAR_CATEGORY_SLUGS,
  getCategory,
  type BatOption,
} from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Size guide",
  description: "Find the right size bat, batting pads, gloves and helmet, and choose a bat's weight, profile and handle.",
};

const CARD = "flex flex-col gap-5 rounded-md border border-border bg-surface-raised p-6 shadow-card md:p-8";

/** The sized gear categories, with their names, shop links and sizing copy from the catalogue. */
const SIZED_GEAR = GEAR_CATEGORY_SLUGS.flatMap((slug) => {
  const content = GEAR_CATEGORY_CONTENT[slug];
  const category = getCategory(slug);
  if (!content.sizes || !content.sizing || !category) return [];
  return [{ slug, name: category.name, href: category.href, sizes: content.sizes, sizing: content.sizing, hands: content.hands }];
});

const BAT_CHOICES: { title: string; options: BatOption[] }[] = [
  { title: "Weight", options: BAT_WEIGHTS },
  { title: "Profile", options: BAT_PROFILES },
  { title: "Handle", options: BAT_HANDLES },
];

/**
 * The footer's "Size Guide": bat sizes (the product pages' table with bat
 * lengths, and the silhouettes), the builder's weight, profile and handle
 * choices, then pads, gloves and helmets from their category copy.
 */
export default function SizeGuidePage() {
  const jumpLinks = [{ id: "bats", name: "Bats" }, ...SIZED_GEAR.map((gear) => ({ id: gear.slug, name: gear.name }))];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-10 py-12 md:py-16">
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow bar>Support</Eyebrow>
            <h1 className="type-heading-xl">Size guide</h1>
            <p className="type-body-lg text-ink-muted">
              Find the right fit for your bat, pads, gloves and helmet. Between two sizes? Choose the smaller one.
            </p>
            <nav aria-label="Size guide sections" className="mt-2">
              <ul className="flex flex-wrap gap-2">
                {jumpLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      className="type-body-sm inline-flex min-h-11 items-center rounded-full border border-border bg-surface-raised px-4 font-semibold transition-colors hover:border-border-strong"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <section id="bats" aria-labelledby="bats-title" className={`${CARD} scroll-mt-6`}>
            <div className="flex flex-col gap-1.5">
              <h2 id="bats-title" className="type-heading-lg">
                Bats
              </h2>
              <p className="type-body text-ink-muted">
                Stand tall with your arms by your side. The bat’s handle should reach your wrist.
              </p>
            </div>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
              <div className="flex flex-col gap-3 lg:w-[520px] lg:shrink-0">
                {/* Phones get the home page's three columns; the bat length column needs more room. */}
                <SizeGuideTable className="sm:hidden" />
                <SizeGuideTable boxed className="hidden sm:table" />
                <p className="type-body-sm text-ink-muted">Between two sizes? Choose the smaller one for control.</p>
              </div>
              <SizeSilhouettes className="h-[400px] flex-1" />
            </div>

            <div className="flex flex-col gap-4 border-t border-border pt-6">
              <div className="flex flex-col gap-1.5">
                <h3 className="type-heading-md">Weight, profile and handle</h3>
                <p className="type-body text-ink-muted">
                  Custom bats let you choose all three. Not sure? The balanced weight suits most players.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {BAT_CHOICES.map((choice) => (
                  <div key={choice.title} className="flex flex-col gap-2 rounded-md bg-surface-sunken p-5">
                    <h4 className="type-eyebrow text-ink-muted">{choice.title}</h4>
                    <dl className="flex flex-col gap-2">
                      {choice.options.map((option) => (
                        <div key={option.label} className="flex flex-col">
                          <dt className="type-body font-semibold">{option.label}</dt>
                          <dd className="type-body-sm text-ink-muted">{option.hint}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            {SIZED_GEAR.map((gear) => (
              <section
                key={gear.slug}
                id={gear.slug}
                aria-labelledby={`${gear.slug}-title`}
                className={`${CARD} scroll-mt-6`}
              >
                <h2 id={`${gear.slug}-title`} className="type-heading-lg">
                  {gear.name}
                </h2>
                <ul aria-label="Sizes" className="flex flex-wrap gap-2">
                  {gear.sizes.map((size) => (
                    <li
                      key={size}
                      className="type-body-sm rounded-full bg-surface-sunken px-3 py-1.5 font-semibold"
                    >
                      {size}
                    </li>
                  ))}
                </ul>
                <p className="type-body text-ink-muted">{gear.sizing}</p>
                {gear.hands && (
                  <p className="type-body text-ink-muted">
                    Cut for right- or left-handed batting: choose the way you bat.
                  </p>
                )}
                <Link
                  href={gear.href}
                  className="type-body-sm mt-auto inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                >
                  Shop {gear.name.toLowerCase()}
                </Link>
              </section>
            ))}
          </div>

          <p className="type-body text-ink-muted">
            Still unsure which size to choose?{" "}
            <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">
              Contact us
            </Link>{" "}
            and we’ll help.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
