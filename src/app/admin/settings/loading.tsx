import { PAGE } from "@/components/admin/styles";
import { cn } from "@/lib/utils";

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

/** Settings' shape while it loads: the title, then its sections (beside the section list on desktop). */
export default function SettingsLoading() {
  return (
    <main className={cn(PAGE, "gap-0 lg:gap-0")} aria-busy="true">
      <p role="status" className="sr-only">
        Loading settings…
      </p>
      <div aria-hidden="true" className="flex flex-col">
        <span className="flex items-center justify-between gap-4 pb-4 lg:pt-2 lg:pb-6">
          <Bar className="h-8 w-36" />
          <Bar className="hidden h-11 w-36 rounded-sm lg:block" />
        </span>
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">
          <span className="hidden w-50 shrink-0 flex-col gap-0.5 lg:flex">
            {[0, 1, 2, 3].map((link) => (
              <span key={link} className="flex h-10 items-center px-3">
                <Bar className="h-3 w-28" />
              </span>
            ))}
          </span>
          <div className="flex min-w-0 flex-1 flex-col lg:max-w-[560px]">
            <SectionSkeleton fields={4} />
            <SectionSkeleton fields={3} />
          </div>
        </div>
      </div>
    </main>
  );
}
