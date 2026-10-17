import { Reveal } from "@/components/motion/reveal";
import type { StoreBat, StoreGear } from "@/lib/products/model";

import { BatPlate } from "./bat-plate";
import { GearPlate } from "./gear-plate";
import { KitMiniCard } from "./kit-card";
import { batTile, gearTile } from "./kit-tiles";

const isGear = (product: StoreBat | StoreGear): product is StoreGear => "categorySlug" in product;

/**
 * The products an offer covers: two small cards to a row on phones, the shop's
 * plates from md. They rise in as they scroll into view.
 */
export function OfferProducts({ products }: { products: (StoreBat | StoreGear)[] }) {
  return (
    <Reveal>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:hidden">
        {products.map((product) => (
          <li key={product.id} data-reveal className="min-w-0">
            <KitMiniCard {...(isGear(product) ? gearTile(product) : batTile(product))} className="w-auto min-w-0" />
          </li>
        ))}
      </ul>
      <ul className="grid gap-6 max-md:hidden sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <li key={product.id} data-reveal>
            {isGear(product) ? <GearPlate product={product} /> : <BatPlate bat={product} />}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
