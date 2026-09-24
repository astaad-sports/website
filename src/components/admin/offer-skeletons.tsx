import { cn } from "@/lib/utils";

function Bar({ className }: { className: string }) {
  return <span className={cn("block rounded-xs bg-surface-sunken", className)} />;
}

/** Offer rows while they load: name and tag, dates, status. */
export function OfferRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="flex flex-col border-t border-border">
      {Array.from({ length: rows }, (_, row) => (
        <li key={row} className="flex min-h-18 flex-col justify-center gap-2 border-b border-border py-3">
          <span className="flex items-center justify-between gap-3">
            <Bar className="h-3.5 w-2/5" />
            <Bar className="h-5 w-16" />
          </span>
          <Bar className="h-3 w-3/5" />
          <Bar className="h-3 w-1/4" />
        </li>
      ))}
    </ul>
  );
}

/** Create offer and an offer's page while they load: the list on desktop, then the form's shape. */
export function OfferFormSkeleton() {
  return (
    <main className="flex flex-1 flex-col lg:flex-row" aria-busy="true">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div aria-hidden="true" className="hidden min-w-0 flex-1 flex-col gap-6 px-10 pt-8 pb-12 lg:flex">
        <Bar className="h-8 w-32" />
        <span className="flex gap-2">
          <Bar className="h-11 w-24 rounded-full" />
          <Bar className="h-11 w-28 rounded-full" />
          <Bar className="h-11 w-26 rounded-full" />
        </span>
        <OfferRowsSkeleton />
      </div>
      <div
        aria-hidden="true"
        className="flex flex-col gap-6 px-4 pt-1 lg:w-105 lg:shrink-0 lg:border-l lg:border-border lg:bg-surface-raised lg:px-6 lg:pt-6"
      >
        <span className="flex min-h-11 items-center lg:hidden">
          <Bar className="h-4 w-16" />
        </span>
        <Bar className="h-7 w-44" />
        {[0, 1, 2, 3].map((field) => (
          <span key={field} className="flex flex-col gap-1.5">
            <Bar className="h-3 w-24" />
            <Bar className="h-12 w-full rounded-sm" />
          </span>
        ))}
      </div>
    </main>
  );
}
