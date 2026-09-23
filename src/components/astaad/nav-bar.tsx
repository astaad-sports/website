import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { Crest } from "./crest";
import { IconButton } from "./icon-button";
import { SearchInput } from "./search-input";

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface NavBarProps {
  links: NavLink[];
  cartCount?: number;
  /** Show the dark search field (desktop only). */
  search?: boolean;
  homeHref?: string;
  className?: string;
}

/**
 * The black header: crest at 48px on the left, primary links with the active
 * one underlined in `brand-yellow`, a dark SearchInput, then account and cart
 * IconButtons. 64px on desktop. On mobile it is 56px with a menu button (a
 * Sheet holding the links), the crest centred and the cart on the right. It
 * keeps `surface-dark` in both themes.
 */
export function NavBar({
  links,
  cartCount,
  search = true,
  homeHref = "/",
  className,
}: NavBarProps) {
  return (
    <header className={cn("bg-surface-dark text-on-dark", className)}>
      <div className="page-shell flex h-14 items-center gap-6 lg:h-16">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger
              render={<IconButton icon="menu" label="Open menu" onDark />}
            />
            <SheetContent
              side="left"
              className="w-4/5 border-border-on-dark bg-surface-dark text-on-dark [&_[data-slot=sheet-close]]:text-on-dark [&_[data-slot=sheet-close]]:hover:bg-surface-dark-raised"
            >
              <SheetHeader className="border-b border-border-on-dark">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Crest size={40} />
              </SheetHeader>
              <nav aria-label="Primary">
                <ul className="flex flex-col">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={link.active ? "page" : undefined}
                        className="flex min-h-11 items-center px-4 text-sm leading-5 font-semibold text-on-dark aria-[current=page]:text-brand-yellow"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <Link
          href={homeHref}
          aria-label="Astaad Sports home"
          className="mx-auto inline-flex shrink-0 lg:mx-0"
        >
          <Crest size={48} priority className="h-10! lg:h-12!" />
        </Link>

        <nav aria-label="Primary" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center gap-5">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  className="inline-block border-b-2 border-transparent py-1.5 text-sm leading-5 font-semibold whitespace-nowrap text-on-dark aria-[current=page]:border-brand-yellow"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {search && (
          <SearchInput onDark wrapperClassName="hidden max-w-[260px] xl:flex" />
        )}

        <div className="flex items-center gap-2">
          <IconButton
            icon="user"
            label="Account"
            onDark
            className="hidden lg:inline-flex"
          />
          <IconButton icon="cart" label="Cart" onDark count={cartCount} />
        </div>
      </div>
    </header>
  );
}
