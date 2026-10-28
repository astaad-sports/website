// The messages the store sends on WhatsApp, and the JSON body Meta's
// POST /<phone number id>/messages takes for each. Pure; ./cloud-api.ts sends them.

/** One choice in a list menu: `id` comes back when it is tapped. */
export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

/** A reply button: `id` comes back when it is tapped. */
export interface ReplyButton {
  id: string;
  title: string;
}

/** A template parameter: Meta allows no new lines, tabs or more than four spaces in a row. */
export type TemplateParameter = string;

export type OutgoingMessage =
  | { type: "text"; body: string; previewUrl?: boolean }
  /** A list menu: a button that opens up to ten rows in sections. */
  | {
      type: "list";
      header?: string;
      body: string;
      footer?: string;
      button: string;
      sections: { title: string; rows: ListRow[] }[];
    }
  /** Up to three reply buttons under the text. */
  | { type: "buttons"; body: string; footer?: string; buttons: ReplyButton[] }
  /** One button that opens a web address. */
  | { type: "link"; body: string; footer?: string; label: string; url: string }
  /** An approved template, the only kind Meta delivers outside the 24 hours after the customer last wrote. */
  | {
      type: "template";
      name: string;
      language: string;
      body: TemplateParameter[];
      /** The end of the template's URL button's address, filling its {{1}}. */
      urlSuffix?: string;
    };

/** Meta's limits on interactive messages, in characters. */
export const LIMITS = {
  body: 1024,
  text: 4096,
  header: 60,
  footer: 60,
  listButton: 20,
  sectionTitle: 24,
  rowTitle: 24,
  rowDescription: 72,
  rowId: 200,
  replyTitle: 20,
  linkLabel: 20,
  rows: 10,
  buttons: 3,
  parameter: 200,
} as const;

/** Cut to `max` characters, with an ellipsis when anything was cut. */
export function fit(value: string, max: number): string {
  const chars = [...value];
  return chars.length <= max ? value : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

/** A value fit for a template parameter: on one line, without runs of spaces, never empty. */
export function templateParameter(value: string | null | undefined): string {
  const flat = (value ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
  return fit(flat || "-", LIMITS.parameter);
}

/**
 * The body for POST /<phone number id>/messages, to `to` (a waId), with
 * each text cut to what Meta accepts, so a long product name never gets a
 * message refused.
 */
export function messagePayload(to: string, message: OutgoingMessage): Record<string, unknown> {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to };
  const footer = (text?: string) => (text ? { footer: { text: fit(text, LIMITS.footer) } } : {});
  switch (message.type) {
    case "text":
      return { ...base, type: "text", text: { body: fit(message.body, LIMITS.text), preview_url: message.previewUrl ?? false } };
    case "list":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "list",
          ...(message.header ? { header: { type: "text", text: fit(message.header, LIMITS.header) } } : {}),
          body: { text: fit(message.body, LIMITS.body) },
          ...footer(message.footer),
          action: {
            button: fit(message.button, LIMITS.listButton),
            sections: message.sections.map((section) => ({
              title: fit(section.title, LIMITS.sectionTitle),
              rows: section.rows.map((row) => ({
                id: row.id.slice(0, LIMITS.rowId),
                title: fit(row.title, LIMITS.rowTitle),
                ...(row.description ? { description: fit(row.description, LIMITS.rowDescription) } : {}),
              })),
            })),
          },
        },
      };
    case "buttons":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: fit(message.body, LIMITS.body) },
          ...footer(message.footer),
          action: {
            buttons: message.buttons.slice(0, LIMITS.buttons).map((button) => ({
              type: "reply",
              reply: { id: button.id, title: fit(button.title, LIMITS.replyTitle) },
            })),
          },
        },
      };
    case "link":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: { text: fit(message.body, LIMITS.body) },
          ...footer(message.footer),
          action: {
            name: "cta_url",
            parameters: { display_text: fit(message.label, LIMITS.linkLabel), url: message.url },
          },
        },
      };
    case "template":
      return {
        ...base,
        type: "template",
        template: {
          name: message.name,
          language: { code: message.language },
          components: [
            { type: "body", parameters: message.body.map((text) => ({ type: "text", text: templateParameter(text) })) },
            ...(message.urlSuffix !== undefined
              ? [{ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: message.urlSuffix }] }]
              : []),
          ],
        },
      };
  }
}
