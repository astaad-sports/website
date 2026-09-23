import type { ComponentProps } from "react";
import {
  ArrowRight,
  ChevronRight,
  Heart,
  House,
  LayoutGrid,
  Lock,
  Menu,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Trash2,
  Truck,
  User,
} from "lucide-react";

/**
 * The Astaad icon set: Lucide outline icons at a 1.5px stroke, 20–24px, in the
 * current text colour. The design system ships no icon files; Lucide is the
 * chosen outline set.
 */
const ICONS = {
  cart: ShoppingCart,
  search: Search,
  heart: Heart,
  user: User,
  home: House,
  grid: LayoutGrid,
  truck: Truck,
  shield: ShieldCheck,
  box: Package,
  lock: Lock,
  trash: Trash2,
  chevron: ChevronRight,
  star: Star,
  filter: SlidersHorizontal,
  menu: Menu,
  minus: Minus,
  plus: Plus,
  "arrow-right": ArrowRight,
} as const;

export type IconName = keyof typeof ICONS;

export type IconProps = Omit<ComponentProps<typeof Star>, "name"> & {
  name: IconName;
};

export function Icon({ name, strokeWidth = 1.5, ...props }: IconProps) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
