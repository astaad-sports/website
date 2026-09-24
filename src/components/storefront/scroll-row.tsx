"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A list that scrolls sideways, with a thin bar under it (below md) showing
 * how much of the row is on screen and where.
 */
export function ScrollRow({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const row = useRef<HTMLUListElement>(null);
  const [view, setView] = useState({ start: 0, size: 1 });

  useEffect(() => {
    const node = row.current;
    if (!node) return;
    function measure() {
      if (!node || node.scrollWidth === 0) return;
      setView({ start: node.scrollLeft / node.scrollWidth, size: node.clientWidth / node.scrollWidth });
    }
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <ul ref={row} aria-label={label} className={className}>
        {children}
      </ul>
      {view.size < 1 && (
        <div aria-hidden="true" className="relative h-0.5 rounded-full bg-border md:hidden">
          <span
            className="absolute inset-y-0 rounded-full bg-foreground"
            style={{ left: `${view.start * 100}%`, width: `${view.size * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
