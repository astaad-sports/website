import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Astaad Button. `default` is the single brand-yellow call to action (one per
 * view region); `secondary` / `outline` is the black outline button; `ghost` is
 * for "View All" style links. 44px tall by default, `sm` 36px (product cards),
 * `lg` 52px (checkout). Icon sizes are 40px circles.
 *
 * Render as a link: `<Button render={<Link href="/shop" />} nativeButton={false}>`.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border-[1.5px] border-transparent text-sm leading-5 font-semibold whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-brand-yellow text-on-yellow hover:bg-brand-yellow-hover",
        secondary:
          "border-border-strong bg-transparent text-foreground hover:bg-surface-sunken",
        outline:
          "border-border-strong bg-transparent text-foreground hover:bg-surface-sunken",
        ghost: "bg-transparent text-foreground hover:bg-surface-sunken",
        destructive: "bg-transparent text-danger hover:bg-surface-sunken",
        link: "border-0 bg-transparent text-foreground underline underline-offset-4 hover:text-ink-muted",
      },
      size: {
        default: "min-h-11 rounded-md px-4 py-2",
        sm: "min-h-9 rounded-md px-3 py-1.5 text-[13px] leading-[18px]",
        lg: "min-h-13 rounded-md px-6 py-3 text-base leading-6",
        xs: "min-h-8 rounded-sm px-2.5 py-1 text-[13px] leading-[18px] [&_svg:not([class*='size-'])]:size-4",
        icon: "size-10 rounded-full",
        "icon-sm":
          "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12 rounded-full",
        "icon-xs":
          "size-7 rounded-full [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = Omit<ButtonPrimitive.Props, "className"> &
  VariantProps<typeof buttonVariants> & { className?: string }

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants, type ButtonProps }
