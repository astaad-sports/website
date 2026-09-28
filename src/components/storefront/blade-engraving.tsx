import { Open_Sans } from "next/font/google";

import { cn } from "@/lib/utils";

// The engraver's lettering: bold italic capitals. Only the builders use it,
// so it is loaded here and not with the site's own families.
const lettering = Open_Sans({
  subsets: ["latin"],
  weight: "700",
  style: "italic",
  display: "swap",
  preload: false,
});

/** Capitals in the brown a laser burns into willow. */
const ENGRAVED = cn(lettering.className, "leading-none tracking-[0.02em] whitespace-nowrap text-[#986742] uppercase");

// A bat photo fills its box from handle to toe, and every blade sits the same way in
// it: about 11% of the box's height wide, centred, clear of stickers below 68%.
// The sizes here are in hundredths of that height (cqh).
const LETTER = 3.25;
/** The length of blade the name may take. */
const ROOM = 26;
/** A letter's average width with its spacing, in em. */
const LETTER_WIDTH = 0.66;

/**
 * The name as it is cut: along the right of the lower blade, read from the toe
 * up. A long name gets smaller letters, so it stays below the stickers. For a
 * photo box that is a size container (`[container-type:size]`).
 */
export function BladeEngraving({ text }: { text: string }) {
  const size = Math.min(LETTER, ROOM / (LETTER_WIDTH * Math.max(text.length, 1)));
  return (
    <span
      aria-hidden="true"
      style={{ fontSize: `${size.toFixed(2)}cqh` }}
      className={cn(ENGRAVED, "absolute top-[82.2%] left-[calc(50%+3.1cqh)] -translate-1/2 -rotate-90 mix-blend-multiply")}
    >
      {text}
    </span>
  );
}

/** The same lettering on a strip of willow, large enough to read. */
export function EngravingSwatch({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-xs bg-[linear-gradient(180deg,#f3e7cd_0%,#e8d6b2_100%)] px-4",
        className
      )}
    >
      <span className={cn(ENGRAVED, "text-lg")}>{text}</span>
    </div>
  );
}
