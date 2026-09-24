"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, ShoppingCart, User } from "lucide-react";

import { useCart } from "@/components/cart/use-cart";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Home", href: "/", icon: House, match: (path: string) => path === "/" },
  { label: "Shop", href: "/#categories", icon: LayoutGrid, match: (path: string) => path.startsWith("/shop") || path.startsWith("/bats") },
  { label: "Cart", href: "/cart", icon: ShoppingCart, match: (path: string) => path === "/cart" },
  { label: "Account", href: "/account", icon: User, match: (path: string) => path.startsWith("/account") },
];

/**
 * The phone's bottom tab bar: Home, Shop, Cart (with the live count) and
 * Account, fixed to the foot of the screen below md. A spacer the bar's
 * height keeps it from covering the end of the page.
 */
export function MobileTabBar() {
  const path = usePathname();
  const { count } = useCart();

  return (
    <>
      <div aria-hidden="true" className="h-[calc(64px+env(safe-area-inset-bottom))] bg-surface-dark-sunken md:hidden" />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-dark-raised bg-surface-dark pb-[env(safe-area-inset-bottom)] text-on-dark md:hidden"
      >
        <ul className="grid h-16 grid-cols-4 px-2">
          {TABS.map((tab) => {
            const active = tab.match(path);
            const cart = tab.href === "/cart";
            return (
              <li key={tab.label} className="flex">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={cart && count ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : undefined}
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] leading-[14px] font-medium text-on-dark-muted",
                    "focus-visible:outline-brand-yellow aria-[current=page]:font-semibold aria-[current=page]:text-brand-yellow"
                  )}
                >
                  <tab.icon className="size-[22px]" strokeWidth={1.5} aria-hidden="true" />
                  {tab.label}
                  {cart && count > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 left-1/2 ml-1.5 h-4 min-w-4 rounded-full bg-brand-yellow px-1 text-center text-[10px] leading-4 font-bold text-on-yellow"
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
