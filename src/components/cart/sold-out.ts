/**
 * Greys out whatever look the caller gave a button, keeping its size, for a
 * product that is out of stock. The hairline keeps its outline visible on the
 * grey kit tiles. In a file of its own so server components can use it too.
 */
export const SOLD_OUT_CLASSES =
  "cursor-not-allowed border-border bg-surface-sunken text-ink-muted hover:border-border hover:bg-surface-sunken";
