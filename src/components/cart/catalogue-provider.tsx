"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { StoreCatalogue } from "@/lib/products/model";

const CatalogueContext = createContext<StoreCatalogue | null>(null);

/**
 * The public catalogue, handed down from the root layout so the cart can
 * show current prices and stock in the browser. Checkout prices it again on the server.
 */
export function CatalogueProvider({ catalogue, children }: { catalogue: StoreCatalogue; children: ReactNode }) {
  return <CatalogueContext value={catalogue}>{children}</CatalogueContext>;
}

export function useCatalogue(): StoreCatalogue {
  const catalogue = useContext(CatalogueContext);
  if (!catalogue) throw new Error("useCatalogue needs a CatalogueProvider above it (see the root layout).");
  return catalogue;
}
