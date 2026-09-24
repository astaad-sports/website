import type { Metadata } from "next";
import Link from "next/link";

import { ReviewForm, type ReviewProductOption } from "@/components/reviews/review-form";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { categoryName, subcategoryName } from "@/lib/products/model";

export const metadata: Metadata = {
  title: "Write a review",
  description: "Tell other players about your Astaad bat or gear, or send the Astaad team your feedback.",
};

/**
 * The customer's review form. Anyone can send one, signed in or not; it goes
 * on the site once the admin has checked it, or stays with the store when
 * the customer keeps it private. A link to share with customers after delivery.
 */
export default async function WriteReviewPage() {
  const catalogue = await getStoreCatalogue();
  // "English Willow Bats", "Tennis Bats".
  const batGroup = (subcategory: string) => {
    const name = subcategoryName(subcategory) ?? "Bats";
    return name.endsWith("Bats") ? name : `${name} Bats`;
  };
  const products: ReviewProductOption[] = [
    ...catalogue.bats.map((bat) => ({ id: bat.id, name: bat.name, group: batGroup(bat.subcategory) })),
    ...catalogue.gear.map((gear) => ({ id: gear.id, name: gear.name, group: categoryName(gear.categorySlug) })),
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow bar>Customer reviews</Eyebrow>
            <h1 className="type-heading-xl">Write a review</h1>
            <p className="type-body-lg text-ink-muted">
              How is your bat or gear playing? Tell other players, and add a photo from the nets or the middle. We
              read every review and put it on the site once we&apos;ve checked it.
            </p>
            <p className="type-body text-ink-muted">
              Something to tell only us? Tick &ldquo;Keep this private&rdquo; and it comes straight to the Astaad team.
              See what others have said on{" "}
              <Link href="/reviews" className="font-semibold text-foreground underline underline-offset-4">
                our reviews page
              </Link>
              .
            </p>
          </div>
          <div className="max-w-[720px]">
            <ReviewForm products={products} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
