import { createCn } from "cn/config"

/**
 * Class merging (clsx + tailwind-merge semantics) taught the Astaad theme keys
 * so `rounded-circle`, `shadow-card` and the `type-*` text styles conflict
 * with their Tailwind counterparts the way built-in values do.
 */
export const cn = createCn({
  extend: {
    theme: {
      radius: ["pill", "circle"],
      shadow: ["card", "float"],
    },
    classGroups: {
      "astaad-type": [
        {
          type: [
            "display-hero",
            "display-xl",
            "display-lg",
            "display-md",
            "heading-xl",
            "heading-lg",
            "heading-md",
            "heading-sm",
            "body-lg",
            "body",
            "body-sm",
            "caption",
            "eyebrow",
            "price-lg",
            "price",
            "label",
            "badge",
            "script-accent",
          ],
        },
      ],
    },
  },
})
