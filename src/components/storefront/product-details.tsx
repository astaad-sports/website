import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { countInWords, listInWords, offeredWeightGroups, type StoreBat } from "@/lib/products/model";

import { Eyebrow } from "./eyebrow";

interface Row {
  id: string;
  title: string;
  body: string;
}

/** The Weight row: the ranges the bat offers, by size once it is sold in sizes with ranges of their own. */
function weightRow(bat: StoreBat): Row | null {
  const groups = offeredWeightGroups(bat);
  if (groups.length === 0) return null;
  const weighed = "weighed without grip and scuff sheet";
  const body =
    groups.length === 1
      ? groups[0].weights.length > 1
        ? `${countInWords(groups[0].weights.length)} ranges: ${listInWords(groups[0].weights)}, ${weighed}.`
        : `${groups[0].weights[0]}, ${weighed}.`
      : `${groups.map((group) => `${group.name}: ${listInWords(group.weights)}`).join(". ")}. All ${weighed}.`;
  return { id: "weight", title: "Weight", body };
}

/** The rows that describe build options, naming only the ones this bat offers. */
function buildRows(bat: StoreBat): { profile: Row | null; weight: Row | null; handle: Row; care: Row } {
  const { customization } = bat;
  const { enabled, profiles, handles } = customization;
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
    weight: enabled ? weightRow(bat) : null,
    handle: {
      id: "handle",
      title: "Handle",
      body: enabled
        ? `Multi-piece Singapore cane with rubber inserts for shock absorption. ${handleShapes.charAt(0).toUpperCase()}${handleShapes.slice(1)} shape, fitted with an Astaad chevron grip.`
        : "Multi-piece Singapore cane with rubber inserts for shock absorption, fitted with an Astaad chevron grip.",
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

/** The sizes this bat is sold in: willow sizes point to the size guide, tennis sizes give their length. */
function sizeBody({ sizes, subcategory }: StoreBat): string {
  if (subcategory === "tennis-bats") {
    return `${listInWords(sizes.map((size) => (size.hint ? `${size.label} (${size.hint})` : size.label)))}.`;
  }
  return `${listInWords(sizes.map((size) => size.label))}. See the size guide above for age and height ranges.`;
}

/** Specifications as an accordion, one row open at a time. */
export function ProductDetails({ bat }: { bat: StoreBat }) {
  const build = buildRows(bat);
  const rows = [
    { id: "details", title: "Product Details", body: bat.details },
    build.profile,
    { id: "willow", title: "Willow Grade", body: bat.willow },
    build.weight,
    { id: "size", title: "Size", body: sizeBody(bat) },
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
