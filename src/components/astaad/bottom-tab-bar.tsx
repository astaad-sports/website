"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Icon, type IconName } from "./icon";

export interface TabItem {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
}

/** Home, Shop, My Cart, Account — keep four. */
export const DEFAULT_TABS: readonly TabItem[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "shop", label: "Shop", icon: "grid" },
  { id: "cart", label: "My Cart", icon: "cart" },
  { id: "account", label: "Account", icon: "user" },
];

export interface BottomTabBarProps {
  tabs?: readonly TabItem[];
  /** Controlled active tab; leave undefined for internal state. */
  active?: string;
  defaultActive?: string;
  onChange?: (id: string) => void;
  className?: string;
}

/**
 * The fixed mobile navigation: four tabs with the active icon filled
 * `brand-yellow` and its label in `ink`. 64px tall on `surface-raised` with a
 * `border` top. Position it yourself: `fixed inset-x-0 bottom-0 md:hidden`.
 */
export function BottomTabBar({
  tabs = DEFAULT_TABS,
  active,
  defaultActive = tabs[0]?.id,
  onChange,
  className,
}: BottomTabBarProps) {
  const [internalActive, setInternalActive] = useState(defaultActive);
  const current = active ?? internalActive;

  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex h-16 w-full items-stretch justify-around border-t border-border bg-surface-raised",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === current;
        return (
          <Button
            key={tab.id}
            variant="ghost"
            size="xs"
            render={tab.href ? <Link href={tab.href} /> : undefined}
            nativeButton={!tab.href}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (active === undefined) setInternalActive(tab.id);
              onChange?.(tab.id);
            }}
            className={cn(
              "h-auto min-h-0 flex-1 flex-col gap-0.5 rounded-none px-1 py-0 text-[11px] leading-[14px] font-medium text-ink-muted hover:bg-transparent",
              isActive && "text-foreground"
            )}
          >
            <Icon
              name={tab.icon}
              className={cn(
                "size-[22px]",
                isActive && "fill-brand-yellow stroke-brand-yellow"
              )}
            />
            <span>{tab.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
