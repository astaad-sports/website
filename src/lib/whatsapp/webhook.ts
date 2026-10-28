// Meta's WhatsApp webhook: its signature, and the messages and delivery
// statuses in a delivery, read leniently. Pure.
import { createHmac, timingSafeEqual } from "node:crypto";

import type { WhatsAppMessageStatus } from "@/db/schema";

/** X-Hub-Signature-256: "sha256=" and the HMAC-SHA256 of the raw body with the app secret, in hex. */
export function isValidMetaSignature(rawBody: string, header: string, appSecret: string): boolean {
  const expected = Buffer.from(`sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`, "utf8");
  const received = Buffer.from(header.trim(), "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** A customer's message, as much of it as the bot reads. */
export interface InboundMessage {
  /** WhatsApp's id for it. */
  id: string;
  /** Who sent it, as a waId. */
  from: string;
  /** The name on their WhatsApp profile. */
  profileName: string | null;
  /** What they typed; null for a photo, a voice note and the like. */
  text: string | null;
  /** The id of the list row or reply button they tapped. */
  choice: string | null;
}

/** What Meta says became of a message the store sent. */
export interface StatusUpdate {
  wamid: string;
  status: Exclude<WhatsAppMessageStatus, "sending">;
  /** Meta's reason, for a failed one. */
  error: string | null;
}

export interface WebhookContents {
  messages: InboundMessage[];
  statuses: StatusUpdate[];
  /**
   * The customers (waIds) someone at the shop wrote to from the WhatsApp
   * Business app, which shares the number with the Cloud API (Meta's
   * "coexistence"; the `smb_message_echoes` field).
   */
  echoes: string[];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

const STATUSES = new Set(["sent", "delivered", "read", "failed"]);

/** Meta's reason for a failed message: "131047 Re-engagement message: More than 24 hours…". */
function statusError(errors: unknown): string | null {
  const [first] = list(errors).map(record);
  if (!first) return null;
  const details = text(record(first.error_data).details);
  return [first.code, text(first.title) ?? text(first.message), details].filter(Boolean).join(" ").slice(0, 500) || null;
}

/** The messages, statuses and echoes in a webhook delivery; anything else in it (or anything malformed) is left out. */
export function readWebhook(body: unknown): WebhookContents {
  const contents: WebhookContents = { messages: [], statuses: [], echoes: [] };
  for (const entry of list(record(body).entry)) {
    for (const change of list(record(entry).changes)) {
      const value = record(record(change).value);
      const names = new Map(
        list(value.contacts).map((contact) => [
          text(record(contact).wa_id),
          text(record(record(contact).profile).name),
        ])
      );

      for (const raw of list(value.messages)) {
        const message = record(raw);
        const id = text(message.id);
        const from = text(message.from);
        if (!id || !from) continue;
        const interactive = record(message.interactive);
        const tapped = record(interactive.list_reply ?? interactive.button_reply);
        contents.messages.push({
          id,
          from,
          profileName: names.get(from) ?? null,
          text: text(record(message.text).body) ?? text(record(message.button).text),
          choice: text(tapped.id) ?? text(record(message.button).payload),
        });
      }

      for (const raw of list(value.message_echoes)) {
        const to = text(record(raw).to);
        if (to && !contents.echoes.includes(to)) contents.echoes.push(to);
      }

      for (const raw of list(value.statuses)) {
        const status = record(raw);
        const wamid = text(status.id);
        const state = text(status.status);
        if (!wamid || !state || !STATUSES.has(state)) continue;
        contents.statuses.push({
          wamid,
          status: state as StatusUpdate["status"],
          error: state === "failed" ? (statusError(status.errors) ?? "Failed") : null,
        });
      }
    }
  }
  return contents;
}

/** The order a status follows, so a late "delivered" never undoes "read". */
const RANK: Record<WhatsAppMessageStatus, number> = { sending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

/** The statuses a message may be in for `next` to replace: earlier ones; `failed` replaces any but `read`. */
export function statusesBefore(next: StatusUpdate["status"]): WhatsAppMessageStatus[] {
  const all = Object.keys(RANK) as WhatsAppMessageStatus[];
  if (next === "failed") return all.filter((status) => status !== "read" && status !== "failed");
  return all.filter((status) => status !== "failed" && RANK[status] < RANK[next]);
}
