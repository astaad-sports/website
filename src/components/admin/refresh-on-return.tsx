"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The admin frame (and its to-ship count) is a layout, which Next.js does not
 * re-render on navigation. Refresh it whenever the admin comes back to the tab,
 * so a new order shows up without a reload.
 */
export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);
  return null;
}
