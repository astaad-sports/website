// Astaad Sports design system — composite components.
// Primitives (Button, Badge, Input, Card, Sheet, …) live in `@/components/ui`
// and are already themed with the Astaad tokens from `app/globals.css`.

export { Icon, type IconName, type IconProps } from "./icon";
export { Crest, type CrestProps } from "./crest";
export { PriceRating, type PriceRatingProps } from "./price-rating";
export { IconButton, type IconButtonProps } from "./icon-button";
export { SearchInput, type SearchInputProps } from "./search-input";
export { ProductCard, type ProductCardProps } from "./product-card";
export {
  CategoryChip,
  CATEGORIES,
  type Category,
  type CategoryChipProps,
} from "./category-chip";
export { NavBar, type NavBarProps, type NavLink } from "./nav-bar";
export { PromoBanner, type PromoBannerProps } from "./promo-banner";
export {
  TrustBadge,
  TRUST_CLAIMS,
  CHECKOUT_TRUST_CLAIM,
  type TrustBadgeProps,
  type TrustIcon,
} from "./trust-badge";
export {
  SizeSelector,
  type SizeSelectorProps,
  type SizeOption,
} from "./size-selector";
export { CartLineItem, type CartLineItemProps } from "./cart-line-item";
export {
  BottomTabBar,
  DEFAULT_TABS,
  type BottomTabBarProps,
  type TabItem,
} from "./bottom-tab-bar";
