import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Astaad Badge: a brand-yellow pill for merchandising flags on product cards
 * ("Bestseller", "New") and, with `size="count"`, the cart item count on the
 * cart icon. `variant="dark"` is a black pill for use on white photography.
 * Status (in stock / out of stock) is copy in `text-success` / `text-danger`,
 * never a badge.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[11px] leading-4 font-bold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-brand-yellow text-on-yellow",
        dark: "bg-surface-dark text-on-dark",
        secondary: "bg-surface-sunken text-foreground",
        outline: "border-border text-foreground",
        destructive: "bg-danger/10 text-danger",
      },
      size: {
        default: "",
        count: "h-[18px] min-w-[18px] px-[5px] py-0 tabular-nums",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  })
}

export { Badge, badgeVariants }
