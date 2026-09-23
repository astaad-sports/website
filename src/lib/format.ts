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
