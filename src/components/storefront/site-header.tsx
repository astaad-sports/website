import Link from "next/link";
import { Heart, Menu, Search, Truck, User } from "lucide-react";

import { Crest } from "@/components/astaad";
import { CartLink } from "@/components/cart/cart-link";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { STORE_CATEGORIES } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

const ACTION_ICON = "size-[22px]";
const ACTION_LINK =
  "relative flex size-11 items-center justify-center rounded-full text-on-dark transition-colors hover:bg-surface-dark-raised";

function HeaderAction({
  href,
  label,
  icon: Icon,
  className,
}: {
  href: string;
  label: string;
  icon: typeof Truck;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(ACTION_LINK, className)}
    >
      <Icon className={ACTION_ICON} strokeWidth={1.5} aria-hidden="true" />
    </Link>
  );
}

/**
 * The 72px black storefront header: crest, the five category links, a search
 * pill, then account, wishlist and cart. On small screens the links move into
 * a Sheet behind a menu button and the crest sits in the centre.
 */
export function SiteHeader({ activeHref }: { activeHref?: string }) {
  const links = STORE_CATEGORIES.map((category) => ({
    label: category.name,
    href: category.href,
  }));

  return (
    <header className="border-b border-surface-dark-raised bg-surface-dark text-on-dark">
      <div className="site-shell flex h-14 items-center gap-4 lg:h-[72px] lg:gap-10">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger
              aria-label="Open menu"
              className="flex size-11 items-center justify-center rounded-full text-on-dark hover:bg-surface-dark-raised"
            >
              <Menu className={ACTION_ICON} strokeWidth={1.5} aria-hidden="true" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-4/5 border-border-on-dark bg-surface-dark text-on-dark [&_[data-slot=sheet-close]]:text-on-dark [&_[data-slot=sheet-close]]:hover:bg-surface-dark-raised"
            >
              <SheetHeader className="border-b border-border-on-dark">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Crest size={40} className="self-start" />
              </SheetHeader>
              <nav aria-label="Shop">
                <ul className="flex flex-col">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={link.href === activeHref ? "page" : undefined}
                        className="flex min-h-11 items-center px-4 text-sm leading-5 font-semibold text-on-dark aria-[current=page]:text-brand-yellow"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-auto flex flex-col border-t border-border-on-dark">
                <Link href="/account" className="flex min-h-11 items-center gap-3 px-4 text-sm font-semibold">
                  <User className="size-5" strokeWidth={1.5} aria-hidden="true" />
                  Account
                </Link>
                <Link href="/wishlist" className="flex min-h-11 items-center gap-3 px-4 text-sm font-semibold">
                  <Heart className="size-5" strokeWidth={1.5} aria-hidden="true" />
                  Wishlist
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Link
          href="/"
          aria-label="Astaad Sports home"
          className="mx-auto flex h-12 shrink-0 items-center lg:mx-0"
        >
          <Crest size={46} priority className="h-10! lg:h-[46px]!" />
        </Link>

        <nav aria-label="Shop" className="hidden items-center gap-7 lg:flex">
          {links.map((link) => {
            const active = link.href === activeHref;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-[13px] leading-5 font-semibold tracking-[0.02em] whitespace-nowrap text-on-dark-muted transition-colors hover:text-brand-yellow",
                  active && "border-b-2 border-brand-yellow pb-0.5 text-brand-yellow"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <label className="ml-auto hidden h-11 w-full max-w-[440px] cursor-text items-center gap-3 rounded-full bg-surface-dark-raised px-[18px] text-on-dark-subtle focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-yellow lg:flex">
          <Search className="size-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">Search</span>
          <Input
            type="search"
            placeholder="Search bats, gloves, helmets..."
            className="h-auto flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-sm leading-5 text-on-dark placeholder:text-on-dark-subtle focus-visible:outline-none"
          />
        </label>

        <div className="flex items-center gap-1">
          <HeaderAction href="/account" label="Account" icon={User} className="hidden lg:flex" />
          <HeaderAction href="/wishlist" label="Wishlist" icon={Heart} className="hidden lg:flex" />
          <CartLink className={ACTION_LINK} iconClassName={ACTION_ICON} />
        </div>
      </div>
    </header>
  );
}
