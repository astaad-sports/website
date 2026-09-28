import { expect, test } from "bun:test";

import { siteUrl } from "./site";

test("SITE_URL comes first, without a trailing slash", () => {
  expect(siteUrl({ SITE_URL: "https://astaadsports.com/" })).toBe("https://astaadsports.com");
  expect(siteUrl({ SITE_URL: " https://astaadsports.com ", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe(
    "https://astaadsports.com"
  );
  expect(siteUrl({ SITE_URL: "http://localhost:3001" })).toBe("http://localhost:3001");
});

test("a bare domain gets https://", () => {
  expect(siteUrl({ SITE_URL: "astaadsports.com" })).toBe("https://astaadsports.com");
});

test("then the Vercel production domain, then localhost", () => {
  expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "astaad-sports.vercel.app" })).toBe(
    "https://astaad-sports.vercel.app"
  );
  expect(siteUrl({ SITE_URL: "  ", VERCEL_PROJECT_PRODUCTION_URL: "" })).toBe("http://localhost:3000");
  expect(siteUrl({})).toBe("http://localhost:3000");
});

test("a value that is not an http(s) address is skipped", () => {
  expect(siteUrl({ SITE_URL: "javascript:alert(1)" })).toBe("http://localhost:3000");
  expect(siteUrl({ SITE_URL: "ftp://astaadsports.com" })).toBe("http://localhost:3000");
  expect(siteUrl({ SITE_URL: "https://", VERCEL_PROJECT_PRODUCTION_URL: "astaadsports.com" })).toBe(
    "https://astaadsports.com"
  );
});
