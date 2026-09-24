import { OfferRowsSkeleton } from "@/components/admin/offer-skeletons";
import { PAGE } from "@/components/admin/styles";

function Bar({ className }: { className: string }) {
  return <span className={`block rounded-xs bg-surface-sunken ${className}`} />;
}

/** The Offers list while it loads: title and Create offer, the three tabs, then rows. */
export default function OffersLoading() {
  return (
    <main className={PAGE} aria-busy="true">
      <p role="status" className="sr-only">
        Loading offers…
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <span className="flex items-center justify-between gap-4">
          <Bar className="h-8 w-32" />
          <Bar className="h-11 w-36 rounded-sm" />
        </span>
        <span className="flex gap-2">
          <Bar className="h-11 w-24 rounded-full" />
          <Bar className="h-11 w-28 rounded-full" />
          <Bar className="h-11 w-26 rounded-full" />
        </span>
        <OfferRowsSkeleton />
      </div>
    </main>
  );
}
