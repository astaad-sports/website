import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { type Bat } from "@/lib/catalogue";

import { Eyebrow } from "./eyebrow";

/** Specifications as an accordion, one row open at a time. */
export function ProductDetails({ bat }: { bat: Bat }) {
  const rows = [
    { id: "details", title: "Product Details", body: bat.details },
    {
      id: "profile",
      title: "Bat Profile",
      body: "Choose Duckbill Players, Mid to Low or Full Spine when you customize. Your choice is shaped by hand before pressing.",
    },
    { id: "willow", title: "Willow Grade", body: bat.willow },
    {
      id: "weight",
      title: "Weight",
      body: "Three ranges: 1120–1150 g, 1150–1180 g and 1180–1220 g, weighed without grip and scuff sheet.",
    },
    {
      id: "size",
      title: "Size",
      body: "Size 6, Harrow, Short Handle and Long Handle. See the size guide above for age and height ranges.",
    },
    {
      id: "handle",
      title: "Handle",
      body: "Multi-piece Sarawak cane with rubber inserts for shock absorption. Round, semi oval or oval shape, fitted with an Astaad chevron grip.",
    },
    {
      id: "care",
      title: "Preparation and care",
      body: "Knocked in professionally when you choose match-ready preparation. Oil lightly twice a season, keep the scuff sheet on, and store dry and out of direct sun.",
    },
  ];

  return (
    <section
      aria-labelledby="details-title"
      className="site-shell flex flex-col gap-8 pt-16 pb-16 md:pt-20 lg:flex-row lg:gap-16 xl:h-[720px] xl:pb-0"
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
          Everything about the {bat.name}, in the order players ask.
        </p>
      </div>
      <Accordion
        defaultValue={["details"]}
        multiple={false}
        className="flex-1 border-b border-border"
      >
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
