// What a cart reminder shows: the lines a customer left, still for sale.
// Pure: src/lib/email/notify.ts loads the carts and the catalogue.
import type { OrderItem } from "@/db/schema";
import { priceCart, type CartItem } from "@/lib/cart";
import type { StoreCatalogue } from "@/lib/products/model";

/** One line of a cart reminder. */
export interface ReminderLine {
  name: string;
  /** The product's page, from the site's root. */
  href: string;
  /** The choices in one line, e.g. "SH / Full Size · 1150–1180 g"; null when there are none. */
  details: string | null;
  quantity: number;
  linePaise: number;
}

/** The lines of a saved cart that can be bought now, at today's prices. */
export function linesFromCart(items: CartItem[], catalogue: StoreCatalogue): ReminderLine[] {
  return priceCart(items, catalogue, null)
    .lines.filter((line) => line.problem === null)
    .map((line) => ({
      name: line.name,
      href: line.href,
      details: line.summary || null,
      quantity: line.item.quantity,
      linePaise: line.lineTotalPaise,
    }));
}

/**
 * The lines of a guest's unpaid order whose product is still on the store and
 * not sold out, as they were priced at checkout (what the guest saw).
 */
export function linesFromOrder(items: OrderItem[], catalogue: StoreCatalogue): ReminderLine[] {
  return items.flatMap((item) => {
    const bat = item.productKind === "bat" ? catalogue.bats.find((entry) => entry.slug === item.productSlug) : undefined;
    const gear = item.productKind === "gear" ? catalogue.gear.find((entry) => entry.slug === item.productSlug) : undefined;
    const product = bat ?? gear;
    if (!product || product.soldOut) return [];
    const details = item.options.map((option) => option.value).join(" · ");
    return [
      {
        name: item.productName,
        // As the cart links them (priceBat and priceGear in src/lib/cart.ts).
        href: bat ? `/bats/${bat.slug}` : (gear!.href ?? `/shop/${gear!.categorySlug}/${gear!.slug}`),
        details: details || null,
        quantity: item.quantity,
        linePaise: item.lineTotalPaise,
      },
    ];
  });
}
