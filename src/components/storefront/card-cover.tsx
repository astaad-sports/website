import Link from "next/link";

/**
 * Covers a product card so a click anywhere on it opens the product. Put it
 * last in a `relative` card and lift the card's buttons above it with
 * `relative z-10`. The name stays the one link a keyboard or screen reader meets.
 */
export function CardCover({ href }: { href: string }) {
  return <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0" />;
}
