import { describe, expect, test } from "bun:test";

import { formatWaId, maskWaId, waIdFromPhone, waIdList, whatsappConfig, whatsappStatus } from "./config";

describe("waIdFromPhone", () => {
  test("gives an Indian mobile its country code however it was typed", () => {
    for (const typed of ["9876543210", "+91 98765 43210", "098765 43210", "91-98765-43210"]) {
      expect(waIdFromPhone(typed)).toBe("919876543210");
    }
  });

  test("keeps another country's full number", () => {
    expect(waIdFromPhone("+44 7700 900123")).toBe("447700900123");
  });

  test("turns away landlines, short numbers and blanks", () => {
    expect(waIdFromPhone("0194 2501234")).toBeNull();
    expect(waIdFromPhone("12345")).toBeNull();
    expect(waIdFromPhone("91 12345 67890")).toBeNull();
    expect(waIdFromPhone("")).toBeNull();
    expect(waIdFromPhone(null)).toBeNull();
  });
});

test("waIdList drops blanks, bad numbers and repeats", () => {
  expect(waIdList(" 9876543210, ,+919876543210, 123, 8882074750")).toEqual(["919876543210", "918882074750"]);
  expect(waIdList(undefined)).toEqual([]);
});

test("formatWaId and maskWaId show a number to people", () => {
  expect(formatWaId("919876543210")).toBe("+91 98765 43210");
  expect(formatWaId("447700900123")).toBe("+447700900123");
  expect(maskWaId("919876543210")).toBe("+91 ••••• •3210");
  expect(maskWaId("447700900123")).toBe("+••••••••0123");
});

describe("whatsappConfig", () => {
  test("blank values count as unset, with defaults for the version and language", () => {
    const config = whatsappConfig({ WHATSAPP_ACCESS_TOKEN: " ", WHATSAPP_PHONE_NUMBER_ID: "123" });
    expect(config.accessToken).toBeNull();
    expect(config.phoneNumberId).toBe("123");
    expect(config.graphVersion).toBe("v26.0");
    expect(config.templateLanguage).toBe("en");
    expect(config.businessNumber).toBeNull();
  });

  test("the status says what is set without giving any token away", () => {
    const status = whatsappStatus(null, {
      WHATSAPP_ACCESS_TOKEN: "secret-token",
      WHATSAPP_PHONE_NUMBER_ID: "123",
      WHATSAPP_APP_SECRET: "app",
      NEXT_PUBLIC_WHATSAPP_NUMBER: "+91 88820 74750",
      ADMIN_WHATSAPP_NUMBERS: "9876543210,8882074750",
    });
    // The business number itself is no admin: it can't message itself.
    expect(status).toEqual({
      sending: true,
      webhook: false,
      signup: null,
      fromEnv: true,
      connected: null,
      businessNumber: "+91 88820 74750",
      adminNumbers: 1,
    });
    expect(JSON.stringify(status)).not.toContain("secret");
  });

  test("a number connected through Connect WhatsApp sends without any token in the environment", () => {
    const connected = { displayNumber: "+91 88820 74750", connectedAt: new Date(), synced: true, error: null };
    const status = whatsappStatus(connected, {
      NEXT_PUBLIC_META_APP_ID: "app-id",
      NEXT_PUBLIC_WHATSAPP_SIGNUP_CONFIG_ID: "config-id",
      WHATSAPP_APP_SECRET: "app",
    });
    expect(status).toMatchObject({
      sending: true,
      signup: { appId: "app-id", configId: "config-id", graphVersion: "v26.0" },
      fromEnv: false,
      connected,
    });
  });
});
