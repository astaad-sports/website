import { cn } from "@/lib/utils";

import { PAGE } from "./styles";

function Bar({ className }: { className: string }) {
  return <span className={cn("block rounded-xs bg-surface-sunken", className)} />;
}

function SectionSkeleton({ fields }: { fields: number }) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-5 pb-6">
      <Bar className="h-3 w-28" />
      {Array.from({ length: fields }, (_, field) => (
        <span key={field} className="flex flex-col gap-1.5">
          <Bar className="h-3 w-24" />
          <Bar className="h-12 w-full rounded-sm" />
        </span>
      ))}
    </div>
  );
}

/** The product editor's shape while it loads: title, then sections in the editor's columns. */
export function ProductEditorSkeleton() {
  return (
    <main className={cn(PAGE, "gap-0 pt-1 lg:gap-0 lg:pt-6")} aria-busy="true">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div aria-hidden="true" className="flex max-w-[1048px] flex-col">
        <span className="flex min-h-11 items-center">
          <Bar className="h-4 w-20" />
        </span>
        <span className="flex flex-col gap-2 pt-2 pb-5">
          <Bar className="h-7 w-56" />
          <Bar className="h-3 w-20" />
        </span>
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-12">
          <div className="flex flex-col">
            <SectionSkeleton fields={2} />
            <SectionSkeleton fields={2} />
          </div>
          <div className="flex flex-col">
            <SectionSkeleton fields={3} />
          </div>
        </div>
      </div>
    </main>
  );
}
