import type { Metadata } from "next";

import { ReviewDoneToast } from "@/components/admin/review-done-toast";
import { parseReviewTab, ReviewsOverview, reviewsHref } from "@/components/admin/review-rows";
import { PAGE } from "@/components/admin/styles";
import { listReviewsForAdmin } from "@/db/reviews";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reviews" };

/**
 * Every review, on New, Published and Hidden tabs. Rows open the review; the
 * editor sends the admin back here with ?done=added or ?done=deleted.
 */
export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  const params = await searchParams;
  const tab = parseReviewTab(params.tab);
  const done = params.done === "added" || params.done === "deleted" ? params.done : null;
  await requireAdmin(reviewsHref(tab));
  const reviews = await listReviewsForAdmin();

  return (
    <main className={PAGE}>
      <ReviewsOverview reviews={reviews} tab={tab} now={new Date()} />
      <ReviewDoneToast done={done} href={reviewsHref(tab)} />
    </main>
  );
}
