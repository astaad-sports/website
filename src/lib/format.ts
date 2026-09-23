const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Prices are Indian rupees: the ₹ sign, a space, digits grouped Indian-style — "₹ 28,999". */
export function formatPrice(amount: number): string {
  return `₹ ${rupees.format(amount)}`;
}

/** Ratings read "4.8 (124)" on cards and "4.8 (124 reviews)" on the product page. */
export function formatRating(rating: number, count?: number, reviews = false): string {
  const value = rating.toFixed(1);
  if (count == null) return value;
  return reviews ? `${value} (${count} reviews)` : `${value} (${count})`;
}

/** Orders store integer paise, as Razorpay does: 1649900 → "₹ 16,499". */
export function formatPaise(paise: number): string {
  return formatPrice(paise / 100);
}

/** The customer-facing order number: 10001 → "AST-10001". */
export function formatOrderNumber(number: number): string {
  return `AST-${number}`;
}

const MAX_ORDER_NUMBER = 2_147_483_647; // Postgres integer

/** "10001" or "AST-10001" → 10001; anything else → null. */
export function parseOrderNumber(value: string): number | null {
  const digits = value.trim().replace(/^AST-?/i, "");
  if (!/^\d{1,10}$/.test(digits)) return null;
  const number = Number(digits);
  return number > 0 && number <= MAX_ORDER_NUMBER ? number : null;
}

const orderDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "24 Sept 2026" */
export function formatOrderDate(date: Date): string {
  return orderDate.format(date);
}
