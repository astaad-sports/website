// What the store promises about delivery, from Settings: the product pages'
// promise line and dispatch time, the builder's trust row and the category
// stage. Free delivery reads as it always has.
import { formatPaise } from "@/lib/format";
import { deliveryFeePaise, type Settings } from "@/lib/settings/model";

/** What a product page needs from Settings. */
export interface DeliveryTerms {
  /** The charge per order in paise; 0 while delivery is free. */
  feePaise: number;
  /** As the admin wrote it, e.g. "Ships in 2–3 days"; null when not set. */
  dispatchTime: string | null;
}

export function deliveryTerms(settings: Settings): DeliveryTerms {
  return { feePaise: deliveryFeePaise(settings), dispatchTime: settings.dispatchTime };
}

/** "Free delivery across India", or "Delivery ₹ 150 across India" when Settings charge for it. */
export function deliveryPromise(feePaise: number): string {
  return feePaise ? `Delivery ${formatPaise(feePaise)} across India` : "Free delivery across India";
}

/** The short form for a tight row: "Free delivery" or "Delivery ₹ 150". */
export function deliveryShort(feePaise: number): string {
  return feePaise ? `Delivery ${formatPaise(feePaise)}` : "Free delivery";
}
