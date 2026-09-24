import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { type GearCategoryContent } from "@/lib/catalogue";
import { gearLine, type StoreGear } from "@/lib/products/model";

import { deliveryPromise } from "./delivery";
import { Eyebrow } from "./eyebrow";

/** Product details, sizing, care and delivery (as Settings have it) as an accordion, one row open at a time. */
export function GearDetails({
  product,
  content,
  deliveryFeePaise,
}: {
  product: StoreGear;
  content: GearCategoryContent;
  deliveryFeePaise: number;
}) {
  const rows = [
    {
      id: "details",
      title: "Product Details",
      body: `${[product.name, gearLine(product)].filter(Boolean).join(" · ")}. ${content.summary}`,
    },
    content.sizing ? { id: "sizing", title: "Sizing", body: content.sizing } : null,
    { id: "care", title: "Care", body: content.care },
    {
      id: "delivery",
      title: "Delivery and returns",
      body: `${deliveryPromise(deliveryFeePaise)}. Easy returns within 7 days on unused items in their original packaging. 100% genuine Astaad product.`,
    },
  ].filter((row): row is { id: string; title: string; body: string } => row !== null);

  return (
    <section
      aria-labelledby="details-title"
      className="site-shell flex flex-col gap-8 pt-16 pb-16 md:pt-20 lg:flex-row lg:gap-16"
    >
      <div className="flex w-full flex-col gap-3 lg:w-[340px] lg:shrink-0">
        <Eyebrow>Specifications</Eyebrow>
        <h2
          id="details-title"
          className="text-[32px] leading-9 font-bold tracking-[-0.03em] md:text-[40px] md:leading-[44px]"
        >
          Product details
        </h2>
        <p className="text-[15px] leading-[22px] text-ink-muted">
          Everything about the {product.name}, in the order players ask.
        </p>
      </div>
      <Accordion defaultValue={["details"]} multiple={false} className="flex-1 border-b border-border">
        {rows.map((row) => (
          <AccordionItem key={row.id} value={row.id} className="border-t border-border not-last:border-b-0">
            <AccordionTrigger className="h-16 items-center rounded-none border-0 py-0 text-[17px] leading-6 font-semibold hover:no-underline focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus **:data-[slot=accordion-trigger-icon]:size-5 **:data-[slot=accordion-trigger-icon]:text-foreground">
              {row.title}
            </AccordionTrigger>
            <AccordionContent className="max-w-[640px] pb-5 text-[15px] leading-[22px] text-ink-muted">
              {row.body}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
