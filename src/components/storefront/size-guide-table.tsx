import { BAT_SIZES } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

const HEAD = "text-left text-[11px] leading-[14px] font-semibold tracking-[0.2em] text-ink-muted uppercase";

/**
 * Size, age and player height. `boxed` adds the bat length column, a grey
 * header row and cell padding for the dialog.
 */
export function SizeGuideTable({ boxed, className }: { boxed?: boolean; className?: string }) {
  // Unboxed cells need a right gap too, or "Full Size" runs into "15+ years" on phones.
  const cell = boxed ? "px-3 py-3" : "py-3 pr-3";
  return (
    <table className={cn("w-full border-collapse text-sm leading-5", className)}>
      <thead>
        <tr className={cn(HEAD, boxed && "bg-surface-sunken")}>
          <th scope="col" className={cn("font-semibold", boxed ? "px-3 py-2.5" : "pr-3 pb-2.5")}>Size</th>
          <th scope="col" className={cn("font-semibold", boxed ? "px-3 py-2.5" : "pr-3 pb-2.5")}>Age (approx.)</th>
          <th scope="col" className={cn("font-semibold", boxed ? "px-3 py-2.5" : "pr-3 pb-2.5")}>
            Player height{boxed ? "" : " (approx.)"}
          </th>
          {boxed && <th scope="col" className="px-3 py-2.5 font-semibold">Bat length</th>}
        </tr>
      </thead>
      <tbody>
        {BAT_SIZES.map((size, index) => {
          const [code, name] = size.label.split(" / ");
          return (
            <tr
              key={size.code}
              className={cn(
                boxed ? "border-b border-border" : "border-t border-border",
                !boxed && index === BAT_SIZES.length - 1 && "border-b"
              )}
            >
              <th scope="row" className={cn("text-left font-bold", cell)}>
                {boxed ? size.label : code}
                {!boxed && name && <span className="ml-1 font-medium text-ink-muted">{name}</span>}
              </th>
              <td className={cn("text-ink-muted", cell)}>{size.age}</td>
              <td className={cn("text-ink-muted", cell)}>{size.height}</td>
              {boxed && <td className={cn("text-ink-muted", cell)}>{size.length}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
