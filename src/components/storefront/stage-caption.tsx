/**
 * The row along the bottom of a dark product stage: the caption on the left
 * and the "Built for Greatness" script on the right. The caption stays on one
 * line and never runs into the script: a long label ends in an ellipsis, and
 * the photo count ("2 of 5") always shows in full. The script shows from md,
 * except at lg, where the stage is a column too narrow for both.
 */
export function StageCaption({ label, count }: { label: string; count?: string }) {
  return (
    <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-6 md:inset-x-10 md:bottom-[30px]">
      <p className="type-eyebrow flex min-w-0 text-on-dark-subtle md:mb-1.5">
        <span className="truncate">{label}</span>
        {count && <span className="shrink-0 whitespace-pre">{` · ${count}`}</span>}
      </p>
      <p
        aria-hidden="true"
        className="type-script-accent hidden shrink-0 text-[36px] text-brand-yellow md:block lg:hidden xl:block"
      >
        Built for Greatness
      </p>
    </div>
  );
}
