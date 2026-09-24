// Fulfilment rules shared by the admin pages, their Server Actions and the
// order queries: the five steps a paid order moves through, what the admin
// calls each one, and which list filter holds which statuses.
import type { OrderStatus } from "@/db/schema";

/** A paid order moves through these, in order. The admin can tap any of them. */
export const FULFILMENT_STEPS = ["paid", "confirmed", "packed", "shipped", "delivered"] as const;

export type FulfilmentStatus = (typeof FULFILMENT_STEPS)[number];

export function isFulfilmentStatus(value: unknown): value is FulfilmentStatus {
  return typeof value === "string" && (FULFILMENT_STEPS as readonly string[]).includes(value);
}

export function stepIndex(status: FulfilmentStatus): number {
  return FULFILMENT_STEPS.indexOf(status);
}

/**
 * What the admin reads for each status. A paid order is "Pending" to the
 * admin (it still needs attention); the customer reads "Confirmed" (see status.ts).
 */
export const ADMIN_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Payment pending",
  paid: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * The dot beside a status word, and the word's colour. The word carries the
 * meaning; colour only repeats it.
 */
export const ADMIN_STATUS_TONE: Record<OrderStatus, { dot: string; text: string }> = {
  pending_payment: { dot: "bg-ink-subtle", text: "text-ink-muted" },
  paid: { dot: "bg-brand-yellow-hover", text: "text-foreground" },
  confirmed: { dot: "bg-ink-muted", text: "text-foreground" },
  packed: { dot: "bg-ink-muted", text: "text-foreground" },
  shipped: { dot: "bg-foreground", text: "text-foreground" },
  delivered: { dot: "bg-success", text: "text-success" },
  cancelled: { dot: "bg-danger", text: "text-danger" },
};

/** Moving to Shipped or Delivered needs a tracking ID, so the customer can follow the parcel. */
export function needsTracking(target: FulfilmentStatus): boolean {
  return stepIndex(target) >= stepIndex("shipped");
}

export interface NextStep {
  target: FulfilmentStatus;
  label: string;
}

/** The one button that moves the order on: pack it, ship it, then mark it delivered. */
export function nextStep(status: OrderStatus): NextStep | null {
  switch (status) {
    case "paid":
    case "confirmed":
      return { target: "packed", label: "Mark as packed" };
    case "packed":
      return { target: "shipped", label: "Mark as shipped" };
    case "shipped":
      return { target: "delivered", label: "Mark as delivered" };
    default:
      return null;
  }
}

/** The per-step timestamps, in step order after `paid` (which Razorpay's payment sets). */
export const STEP_TIMESTAMPS = {
  confirmed: "confirmedAt",
  packed: "packedAt",
  shipped: "shippedAt",
  delivered: "deliveredAt",
} as const satisfies Partial<Record<FulfilmentStatus, string>>;

export type StepTimestamp = (typeof STEP_TIMESTAMPS)[keyof typeof STEP_TIMESTAMPS];

/**
 * Moving to `target` stamps every step up to it that has no time yet (so a
 * skipped step still shows as done), and clears every step after it (so moving
 * back undoes a mis-tap). Returns which timestamps to keep-or-set and which to clear.
 */
export function timestampPlan(target: FulfilmentStatus): { stamp: StepTimestamp[]; clear: StepTimestamp[] } {
  const reached = stepIndex(target);
  const stamp: StepTimestamp[] = [];
  const clear: StepTimestamp[] = [];
  for (const [step, column] of Object.entries(STEP_TIMESTAMPS) as [FulfilmentStatus, StepTimestamp][]) {
    (stepIndex(step) <= reached ? stamp : clear).push(column);
  }
  return { stamp, clear };
}

// ---------------------------------------------------------------------------
// The orders list

export type OrderFilter = "all" | "pending" | "shipped" | "delivered";

export const ORDER_FILTERS: { id: OrderFilter; label: string; statuses: OrderStatus[] }[] = [
  { id: "all", label: "All", statuses: ["paid", "confirmed", "packed", "shipped", "delivered", "cancelled"] },
  // Pending means "not shipped yet", so it covers Confirmed and Packed too.
  { id: "pending", label: "Pending", statuses: ["paid", "confirmed", "packed"] },
  { id: "shipped", label: "Shipped", statuses: ["shipped"] },
  { id: "delivered", label: "Delivered", statuses: ["delivered"] },
];

/** The filter in the URL; "to_ship" is the old name for Pending. Anything else is All. */
export function parseOrderFilter(value: unknown): OrderFilter {
  if (value === "to_ship") return "pending";
  return ORDER_FILTERS.some((filter) => filter.id === value) ? (value as OrderFilter) : "all";
}

export function filterStatuses(filter: OrderFilter): OrderStatus[] {
  return ORDER_FILTERS.find((entry) => entry.id === filter)?.statuses ?? ORDER_FILTERS[0].statuses;
}

/** A search box value, trimmed and capped, or null when there is nothing to search for. */
export function normaliseSearch(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return query === "" ? null : query;
}

/** A search term for SQL `ILIKE`, with its own `%`, `_` and `\` taken literally. */
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}
