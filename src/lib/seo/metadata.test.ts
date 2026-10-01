import { expect, test } from "bun:test";

import { DEFAULT_SHARE_IMAGE, pageMetadata, productShareImage } from "./metadata";

test("a page's canonical address and its Open Graph address are the same path", () => {
  const metadata = pageMetadata({ title: "Contact us", description: "Call us.", path: "/contact" });
  expect(metadata.alternates?.canonical).toBe("/contact");
  expect(metadata.openGraph?.url).toBe("/contact");
  expect(metadata.title).toBe("Contact us");
  expect(metadata.openGraph?.title).toBe("Contact us");
  expect(metadata.openGraph?.description).toBe("Call us.");
});

test("a page with no picture of its own shows the default one", () => {
  const metadata = pageMetadata({ title: "Shop", description: "Everything.", path: "/shop" });
  expect(metadata.openGraph?.images).toEqual([DEFAULT_SHARE_IMAGE]);
});

test("an absolute title skips the site's suffix and is the Open Graph title too", () => {
  const metadata = pageMetadata({ title: { absolute: "Astaad Sports | Bats" }, description: "Home.", path: "/" });
  expect(metadata.title).toEqual({ absolute: "Astaad Sports | Bats" });
  expect(metadata.openGraph?.title).toBe("Astaad Sports | Bats");
});

test("a product's share picture has a new address when its photo changes", () => {
  const goat = { slug: "goat", name: "G.O.A.T" };
  const first = productShareImage(goat, "https://blob.example/products/a.webp");
  const second = productShareImage(goat, "https://blob.example/products/b.webp");
  expect(first.url).toMatch(/^\/og\/goat\.jpg\?v=[a-z0-9]+$/);
  expect(first.url).not.toBe(second.url);
  expect(productShareImage(goat, "https://blob.example/products/a.webp").url).toBe(first.url);
  expect(first).toMatchObject({ width: 1200, height: 630, alt: "Astaad G.O.A.T" });
  expect(pageMetadata({ title: "G.O.A.T", description: "A bat.", path: "/bats/goat", image: first }).openGraph?.images).toEqual([
    first,
  ]);
});
