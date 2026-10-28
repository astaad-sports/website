import { describe, expect, test } from "bun:test";

import { fit, messagePayload, templateParameter } from "./messages";

describe("templateParameter", () => {
  test("puts a value on one line without runs of spaces", () => {
    expect(templateParameter("Flat 4,\n  Main   Road\tSrinagar")).toBe("Flat 4, Main Road Srinagar");
  });

  test("never sends an empty parameter, which Meta refuses", () => {
    expect(templateParameter("  ")).toBe("-");
    expect(templateParameter(null)).toBe("-");
  });
});

test("fit cuts with an ellipsis only when needed", () => {
  expect(fit("Track an order", 24)).toBe("Track an order");
  expect(fit("Astaad Kashmir Willow Falcon Pro", 24)).toBe("Astaad Kashmir Willow F…");
  expect([...fit("Astaad Kashmir Willow Falcon Pro", 24)]).toHaveLength(24);
});

describe("messagePayload", () => {
  test("a list menu, with its titles cut to Meta's limits", () => {
    const payload = messagePayload("919876543210", {
      type: "list",
      body: "How can we help?",
      button: "Menu",
      sections: [{ title: "Orders", rows: [{ id: "orders", title: "A row title much longer than allowed", description: "x" }] }],
    });
    expect(payload).toMatchObject({
      messaging_product: "whatsapp",
      to: "919876543210",
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: "How can we help?" },
        action: { button: "Menu", sections: [{ title: "Orders", rows: [{ id: "orders", description: "x" }] }] },
      },
    });
    const row = (payload as { interactive: { action: { sections: { rows: { title: string }[] }[] } } }).interactive.action
      .sections[0].rows[0];
    expect([...row.title].length).toBeLessThanOrEqual(24);
  });

  test("at most three reply buttons", () => {
    const payload = messagePayload("919876543210", {
      type: "buttons",
      body: "Pick one",
      buttons: [1, 2, 3, 4].map((n) => ({ id: `b${n}`, title: `Button ${n}` })),
    }) as { interactive: { action: { buttons: unknown[] } } };
    expect(payload.interactive.action.buttons).toHaveLength(3);
  });

  test("a template with its body parameters and URL button suffix", () => {
    expect(
      messagePayload("919876543210", {
        type: "template",
        name: "astaad_order_placed",
        language: "en",
        body: ["Rahul", "AST-10023"],
        urlSuffix: "account/orders/10023",
      })
    ).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "919876543210",
      type: "template",
      template: {
        name: "astaad_order_placed",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Rahul" },
              { type: "text", text: "AST-10023" },
            ],
          },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "account/orders/10023" }] },
        ],
      },
    });
  });
});
