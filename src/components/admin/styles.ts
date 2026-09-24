// Shared class lists for the admin screens, so every page reads as one tool.

/** Page padding: 16px gutters on phones, 40px on desktop. */
export const PAGE = "flex flex-col gap-6 px-4 pt-6 pb-8 lg:gap-8 lg:px-10 lg:pt-8 lg:pb-12";

/** Small tracked uppercase label above a list or section. */
export const SECTION_LABEL = "text-xs leading-4 font-semibold tracking-[0.12em] text-ink-muted uppercase";

/** A list row or form area separated by hairlines, never boxed. */
export const HAIRLINE_LIST = "flex flex-col border-t border-border";

/** Round filter chip; the selected one is yellow. */
export const CHIP =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm leading-5 font-semibold whitespace-nowrap transition-colors";
export const CHIP_ON = "bg-brand-yellow text-on-yellow";
export const CHIP_OFF = "bg-surface-sunken text-foreground hover:bg-border";

/** Buttons at the admin's 6px radius. */
export const BUTTON_BASE =
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm px-4 text-sm leading-5 font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0";
export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-brand-yellow text-on-yellow hover:bg-brand-yellow-hover`;
export const BUTTON_SECONDARY = `${BUTTON_BASE} bg-surface-sunken text-foreground hover:bg-border`;

/** Text fields: a visible 1px border (3.5:1) so the field reads as a field. */
export const FIELD =
  "h-12 w-full min-w-0 rounded-sm border border-ink-subtle bg-surface-raised px-3 text-base leading-[22px] text-foreground placeholder:text-ink-subtle aria-invalid:border-danger lg:text-[15px]";
export const FIELD_LABEL = "text-[13px] leading-[18px] font-semibold";

/** The grey search box on list pages. */
export const SEARCH_FIELD =
  "h-11 w-full min-w-0 rounded-sm bg-surface-sunken pr-3 pl-10 text-base leading-[22px] text-foreground placeholder:text-ink-subtle lg:text-[15px]";
