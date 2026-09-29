import { describe, expect, test } from "bun:test";

import { formatMobile, parseProfileForm, signInMethods } from "./model";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("parseProfileForm", () => {
  test("tidies the name and keeps the ten digits of the mobile number", () => {
    expect(parseProfileForm(form({ name: "  Prabhjot   Singh ", phone: "+91 98765-43210" }))).toEqual({
      ok: true,
      values: { name: "Prabhjot Singh", phone: "9876543210" },
    });
  });

  test("an empty mobile number removes it", () => {
    expect(parseProfileForm(form({ name: "Prabhjot Singh", phone: "  " }))).toEqual({
      ok: true,
      values: { name: "Prabhjot Singh", phone: null },
    });
  });

  test("a missing phone field is the same as an empty one", () => {
    expect(parseProfileForm(form({ name: "Prabhjot Singh" }))).toEqual({
      ok: true,
      values: { name: "Prabhjot Singh", phone: null },
    });
  });

  test("asks for a name", () => {
    const parsed = parseProfileForm(form({ name: " ", phone: "9876543210" }));
    expect(parsed).toEqual({ ok: false, fieldErrors: { name: "Enter your full name." } });
  });

  test("turns down a name that is too long", () => {
    const parsed = parseProfileForm(form({ name: "a".repeat(81) }));
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.fieldErrors.name).toContain("under 80");
  });

  test.each(["12345", "1234567890", "98765 4321", "98765432101", "call me"])("turns down the number %p", (phone) => {
    const parsed = parseProfileForm(form({ name: "Prabhjot Singh", phone }));
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.fieldErrors.phone).toBeTruthy();
  });

  test("reports both fields at once", () => {
    const parsed = parseProfileForm(form({ name: "", phone: "123" }));
    expect(!parsed.ok && Object.keys(parsed.fieldErrors).sort()).toEqual(["name", "phone"]);
  });
});

describe("formatMobile", () => {
  test("splits ten digits in two", () => {
    expect(formatMobile("9876543210")).toBe("98765 43210");
  });

  test("drops the country code Firebase keeps", () => {
    expect(formatMobile("+919876543210")).toBe("98765 43210");
  });

  test("leaves anything else as it is", () => {
    expect(formatMobile("+1 415 555 0100")).toBe("+1 415 555 0100");
  });
});

describe("signInMethods", () => {
  test("names the providers it knows, Google first", () => {
    expect(signInMethods(["password", "google.com"])).toEqual(["Google", "an email and password"]);
  });

  test("leaves out the ones it does not", () => {
    expect(signInMethods(["phone", "password"])).toEqual(["an email and password"]);
    expect(signInMethods([])).toEqual([]);
  });
});
