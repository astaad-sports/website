import { PAGE } from "@/components/admin/styles";

function Bar({ className }: { className: string }) {
  return <span className={`block rounded-xs bg-surface-sunken ${className}`} />;
}

/** Inventory rows while the counts load: a name and status beside a stepper. */
export default function InventoryLoading() {
  return (
    <main className={PAGE} aria-busy="true">
      <p role="status" className="sr-only">
        Loading stock…
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Bar className="h-8 w-40" />
          <Bar className="h-3 w-52" />
        </div>
        <ul className="flex flex-col border-t border-border">
          {[0, 1, 2, 3, 4].map((row) => (
            <li key={row} className="flex min-h-16 items-center gap-3 border-b border-border py-2.5">
              <span className="flex flex-1 flex-col gap-2">
                <Bar className="h-3 w-3/5" />
                <Bar className="h-3 w-1/4" />
              </span>
              <Bar className="h-11 w-34 shrink-0 rounded-sm" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
