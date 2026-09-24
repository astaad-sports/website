import { PAGE } from "@/components/admin/styles";

function Bar({ className }: { className: string }) {
  return <span className={`block rounded-xs bg-surface-sunken ${className}`} />;
}

/** Shown inside the admin frame while a page loads, so a tap always answers at once. */
export default function AdminLoading() {
  return (
    <main className={PAGE} aria-busy="true">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Bar className="h-8 w-48" />
        <ul className="flex flex-col border-t border-border">
          {[0, 1, 2, 3].map((row) => (
            <li key={row} className="flex min-h-16 items-center gap-3 border-b border-border py-2">
              <Bar className="size-12 shrink-0 rounded-sm" />
              <span className="flex flex-1 flex-col gap-2">
                <Bar className="h-3 w-3/5" />
                <Bar className="h-3 w-2/5" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
