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

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const shortDateWithYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const yearInIndia = new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" });

/** "22 Oct" this year, "22 Oct 2025" otherwise; dates are Indian time. */
export function formatShortDate(date: Date, now: Date = new Date()): string {
  const sameYear = yearInIndia.format(date) === yearInIndia.format(now);
  return (sameYear ? shortDate : shortDateWithYear).format(date);
}

/** A 10-digit Indian mobile as "+91 98765 43210"; anything else is shown as given. */
export function formatMobile(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return /^\d{10}$/.test(digits) ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}

/** The same mobile for a tel: link: "+919876543210". */
export function mobileHref(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return /^\d{10}$/.test(digits) ? `tel:+91${digits}` : `tel:${digits}`;
}
