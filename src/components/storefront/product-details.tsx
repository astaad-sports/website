import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { countInWords, listInWords, type StoreBat } from "@/lib/products/model";

import { Eyebrow } from "./eyebrow";

interface Row {
  id: string;
  title: string;
  body: string;
}

/** The rows that describe build options, naming only the ones this bat offers. */
function buildRows({ customization }: StoreBat): { profile: Row | null; weight: Row | null; handle: Row; care: Row } {
  const { enabled, profiles, weights, handles } = customization;
  const handleShapes = listInWords(handles.map((label) => label.toLowerCase()), "or");
  const care = "Oil lightly twice a season, keep the scuff sheet on, and store dry and out of direct sun.";
  return {
    profile: enabled
      ? {
          id: "profile",
          title: "Bat Profile",
          body:
            profiles.length > 1
              ? `Choose ${listInWords(profiles, "or")} when you customize. Your choice is shaped by hand before pressing.`
              : `${profiles[0]}, shaped by hand before pressing.`,
        }
      : null,
    weight: enabled
      ? {
          id: "weight",
          title: "Weight",
          body:
            weights.length > 1
              ? `${countInWords(weights.length)} ranges: ${listInWords(weights)}, weighed without grip and scuff sheet.`
              : `${weights[0]}, weighed without grip and scuff sheet.`,
        }
      : null,
    handle: {
      id: "handle",
      title: "Handle",
      body: enabled
        ? `Multi-piece Sarawak cane with rubber inserts for shock absorption. ${handleShapes.charAt(0).toUpperCase()}${handleShapes.slice(1)} shape, fitted with an Astaad chevron grip.`
        : "Multi-piece Sarawak cane with rubber inserts for shock absorption, fitted with an Astaad chevron grip.",
    },
    care: {
      id: "care",
      title: "Preparation and care",
      body:
        enabled && customization.matchReady
          ? `Knocked in professionally when you choose match-ready preparation. ${care}`
          : care,
    },
  };
}

/** Specifications as an accordion, one row open at a time. */
export function ProductDetails({ bat }: { bat: StoreBat }) {
  const build = buildRows(bat);
  const rows = [
    { id: "details", title: "Product Details", body: bat.details },
    build.profile,
    { id: "willow", title: "Willow Grade", body: bat.willow },
    build.weight,
    {
      id: "size",
      title: "Size",
      body: "Size 6, Harrow, Short Handle and Long Handle. See the size guide above for age and height ranges.",
    },
    build.handle,
    build.care,
  ].filter((row): row is Row => row !== null);

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
