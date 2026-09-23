"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** Flips the `.dark` class on <html> so the storefront theme can be checked. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <Button variant="secondary" size="sm" onClick={() => setDark((d) => !d)}>
      {dark ? "Switch to light theme" : "Switch to dark theme"}
    </Button>
  );
}
