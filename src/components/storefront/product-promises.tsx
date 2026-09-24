import { Check } from "lucide-react";

import { deliveryPromise, type DeliveryTerms } from "./delivery";

/**
 * The ticked promises under a product page's price: delivery as Settings
 * have it, the dispatch time when the admin set one (in their words, "Ships
 * in 2–3 days"), returns and authenticity.
 */
export function ProductPromises({ delivery }: { delivery: DeliveryTerms }) {
  const promises = [
    deliveryPromise(delivery.feePaise),
    delivery.dispatchTime,
    "Easy returns within 7 days",
    "100% Genuine Astaad Product",
  ].filter((promise): promise is string => Boolean(promise));

  return (
    <ul className="flex flex-col gap-1.5 text-sm leading-5">
      {promises.map((promise) => (
        <li key={promise} className="flex items-center gap-2.5">
          <Check className="size-4 text-success" strokeWidth={2.2} aria-hidden="true" />
          {promise}
        </li>
      ))}
    </ul>
  );
}
