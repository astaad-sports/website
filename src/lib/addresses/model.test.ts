import { describe, expect, test } from "bun:test";

import { addressLines, addressSummary, parseAddressForm, sameAddress } from "./model";

const HOME = {
  name: "Arjun Singh Gill",
  phone: "9876543210",
  line1: "14 Model Town",
  line2: "Near the cricket ground",
  city: "Ludhiana",
  state: "Punjab" as const,
  pincode: "141002",
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("parseAddressForm", () => {
  test("tidies what was typed", () => {
    const parsed = parseAddressForm(
      form({ ...HOME, label: "  Home ", name: " Arjun  Singh Gill", phone: "+91 98765-43210", isDefault: "on" })
    );
    expect(parsed).toEqual({ ok: true, values: { ...HOME, label: "Home", isDefault: true } });
  });

  test("the name of the address, the second line and the default are optional", () => {
    const parsed = parseAddressForm(form({ ...HOME, line2: "" }));
    expect(parsed).toEqual({ ok: true, values: { ...HOME, line2: undefined, label: null, isDefault: false } });
  });

  test("reports every field that is wrong, in checkout's words", () => {
    const parsed = parseAddressForm(form({ label: "x".repeat(31), name: "A", phone: "12345", line1: "", city: "", state: "Narnia", pincode: "0123" }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(Object.keys(parsed.fieldErrors).sort()).toEqual(["city", "label", "line1", "name", "phone", "pincode", "state"]);
    expect(parsed.fieldErrors.phone).toBe("Enter a 10-digit mobile number.");
    expect(parsed.fieldErrors.state).toBe("Choose a state.");
    expect(parsed.fieldErrors.pincode).toBe("Enter a 6-digit PIN code.");
  });

  test("an empty form asks for everything but the optional fields", () => {
    const parsed = parseAddressForm(new FormData());
    expect(!parsed.ok && Object.keys(parsed.fieldErrors).sort()).toEqual(["city", "line1", "name", "phone", "pincode", "state"]);
  });
});

describe("sameAddress", () => {
  test("capitals and spacing don't count", () => {
    expect(sameAddress(HOME, { ...HOME, name: "arjun singh  gill", line1: " 14 MODEL TOWN " })).toBe(true);
  });

  test("a missing second line is the same as an empty one", () => {
    expect(sameAddress({ ...HOME, line2: undefined }, { ...HOME, line2: "" })).toBe(true);
  });

  test("another person, phone or place is another address", () => {
    expect(sameAddress(HOME, { ...HOME, name: "Simran Gill" })).toBe(false);
    expect(sameAddress(HOME, { ...HOME, phone: "9876543211" })).toBe(false);
    expect(sameAddress(HOME, { ...HOME, pincode: "141001" })).toBe(false);
    expect(sameAddress(HOME, { ...HOME, line2: undefined })).toBe(false);
  });
});

describe("how an address reads", () => {
  test("its lines, without an empty second line", () => {
    expect(addressLines(HOME)).toEqual(["14 Model Town", "Near the cricket ground", "Ludhiana, Punjab 141002"]);
    expect(addressLines({ ...HOME, line2: undefined })).toEqual(["14 Model Town", "Ludhiana, Punjab 141002"]);
  });

  test("in one line, by its own name or the person's", () => {
    expect(addressSummary({ ...HOME, label: "Home" })).toBe("Home · Ludhiana 141002");
    expect(addressSummary({ ...HOME, label: null })).toBe("Arjun Singh Gill · Ludhiana 141002");
  });
});
