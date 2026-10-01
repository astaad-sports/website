import { expect, test } from "bun:test";

import { analyticsId, GA_MEASUREMENT_ID } from "./analytics";

test("the live site counts visits", () => {
  expect(analyticsId({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(GA_MEASUREMENT_ID);
  // A production build that is not on Vercel.
  expect(analyticsId({ NODE_ENV: "production" })).toBe(GA_MEASUREMENT_ID);
});

test("development and preview deploys do not", () => {
  expect(analyticsId({ NODE_ENV: "development" })).toBeNull();
  expect(analyticsId({ NODE_ENV: "test" })).toBeNull();
  expect(analyticsId({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBeNull();
  expect(analyticsId({})).toBeNull();
});
