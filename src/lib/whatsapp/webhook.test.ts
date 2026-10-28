import { createHmac } from "node:crypto";

import { describe, expect, test } from "bun:test";

import { isValidMetaSignature, readWebhook, statusesBefore } from "./webhook";

describe("isValidMetaSignature", () => {
  const body = '{"object":"whatsapp_business_account"}';
  const signed = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;

  test("takes Meta's signature of the raw body", () => {
    expect(isValidMetaSignature(body, signed, "app-secret")).toBe(true);
  });

  test("turns away another secret, another body or no signature", () => {
    expect(isValidMetaSignature(body, signed, "other-secret")).toBe(false);
    expect(isValidMetaSignature(`${body} `, signed, "app-secret")).toBe(false);
    expect(isValidMetaSignature(body, "", "app-secret")).toBe(false);
  });
});

function delivery(value: Record<string, unknown>) {
  return { object: "whatsapp_business_account", entry: [{ id: "waba", changes: [{ field: "messages", value }] }] };
}

describe("readWebhook", () => {
  test("a typed message, with the writer's profile name", () => {
    const contents = readWebhook(
      delivery({
        contacts: [{ wa_id: "919876543210", profile: { name: "Rahul" } }],
        messages: [{ id: "wamid.1", from: "919876543210", type: "text", text: { body: "hi" } }],
      })
    );
    expect(contents.messages).toEqual([
      { id: "wamid.1", from: "919876543210", profileName: "Rahul", text: "hi", choice: null },
    ]);
  });

  test("a tapped list row and a tapped button", () => {
    const contents = readWebhook(
      delivery({
        messages: [
          { id: "wamid.2", from: "919876543210", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "orders", title: "My orders" } } },
          { id: "wamid.3", from: "919876543210", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "menu", title: "Menu" } } },
        ],
      })
    );
    expect(contents.messages.map((message) => message.choice)).toEqual(["orders", "menu"]);
  });

  test("statuses, with Meta's reason for a failure", () => {
    const contents = readWebhook(
      delivery({
        statuses: [
          { id: "wamid.9", status: "delivered", recipient_id: "919876543210" },
          {
            id: "wamid.10",
            status: "failed",
            errors: [{ code: 131047, title: "Re-engagement message", error_data: { details: "More than 24 hours" } }],
          },
          { id: "wamid.11", status: "deleted" },
        ],
      })
    );
    expect(contents.statuses).toEqual([
      { wamid: "wamid.9", status: "delivered", error: null },
      { wamid: "wamid.10", status: "failed", error: "131047 Re-engagement message More than 24 hours" },
    ]);
  });

  test("anything malformed is left out rather than thrown", () => {
    expect(readWebhook(null)).toEqual({ messages: [], statuses: [] });
    expect(readWebhook({ entry: [{ changes: [{ value: { messages: [{ type: "text" }] } }] }] })).toEqual({
      messages: [],
      statuses: [],
    });
  });
});

test("statusesBefore never moves a message back", () => {
  expect(statusesBefore("sent")).toEqual(["sending"]);
  expect(statusesBefore("delivered")).toEqual(["sending", "sent"]);
  expect(statusesBefore("read")).toEqual(["sending", "sent", "delivered"]);
  expect(statusesBefore("failed")).toEqual(["sending", "sent", "delivered"]);
});
