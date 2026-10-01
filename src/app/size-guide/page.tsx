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
  BAT_TOES,
  BAT_WEIGHT_GROUPS,
  GEAR_CATEGORY_CONTENT,
  GEAR_CATEGORY_SLUGS,
  getCategory,
  weightGroupName,
  type BatOption,
} from "@/lib/catalogue";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { categoryOffered, type StoreCatalogue } from "@/lib/products/model";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  title: "Cricket Bat and Gear Size Guide",
  description:
    "Find the right size bat, batting pads, gloves and helmet, and choose a bat's weight, profile, toe and handle.",
  path: "/size-guide",
});

const CARD = "flex flex-col gap-5 rounded-md border border-border bg-surface-raised p-6 shadow-card md:p-8";

/**
 * The sized gear categories, with their names, shop links and sizing copy,
 * in the sizes their products are on sale in.
 */
function sizedGear(catalogue: StoreCatalogue) {
  return GEAR_CATEGORY_SLUGS.flatMap((slug) => {
    const content = GEAR_CATEGORY_CONTENT[slug];
    const category = getCategory(slug);
    const offered = categoryOffered(catalogue, slug);
    if (!content.sizing || !category || offered.sizes.length === 0) return [];
    return [{ slug, name: category.name, href: category.href, sizes: offered.sizes, sizing: content.sizing(offered), hands: offered.hands }];
  });
}

/** The builder's choices. Weights are by size; the rest are the same in every size. */
const BAT_CHOICES: { title: string; groups: { name?: string; options: BatOption[] }[] }[] = [
  { title: "Weight", groups: BAT_WEIGHT_GROUPS.map((group) => ({ name: weightGroupName(group), options: group.weights })) },
  { title: "Profile", groups: [{ options: BAT_PROFILES }] },
  { title: "Toe", groups: [{ options: BAT_TOES }] },
  { title: "Handle", groups: [{ options: BAT_HANDLES }] },
];

/**
 * The footer's "Size Guide": bat sizes (the product pages' table with bat
 * lengths, and the silhouettes), the builder's weight, profile, toe and
 * handle choices, then pads, gloves and helmets from their category copy.
 */
export default async function SizeGuidePage() {
  const SIZED_GEAR = sizedGear(await getStoreCatalogue());
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
                <h3 className="type-heading-md">Weight, profile, toe and handle</h3>
                <p className="type-body text-ink-muted">
                  Custom bats let you choose all four. Size 6 and Harrow bats are made lighter, in ranges of their own.
                  Not sure? The balanced weight suits most players.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {BAT_CHOICES.map((choice) => (
                  <div
                    key={choice.title}
                    className={cn(
                      "flex flex-col gap-3 rounded-md bg-surface-sunken p-5",
                      // The weight groups take a row of their own, side by side.
                      choice.groups.length > 1 && "md:col-span-2 xl:col-span-3"
                    )}
                  >
                    <h4 className="type-eyebrow text-ink-muted">{choice.title}</h4>
                    <div className={cn("grid gap-4", choice.groups.length > 1 && "sm:grid-cols-3")}>
                      {choice.groups.map((group) => (
                        <div key={group.name ?? choice.title} className="flex flex-col gap-2">
                          {group.name && <h5 className="type-body-sm font-semibold">{group.name}</h5>}
                          <dl className="flex flex-col gap-2">
                            {group.options.map((option) => (
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
