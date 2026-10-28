import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { statusesBefore, type StatusUpdate } from "@/lib/whatsapp/webhook";

import { getDb } from "./index";
import {
  users,
  whatsappContacts,
  whatsappLinkTokens,
  whatsappMessages,
  type WhatsAppContact,
  type WhatsAppMessage,
  type WhatsAppMessageKind,
} from "./schema";

/** Meta's error messages are short; anything longer is cut to this. */
const MAX_ERROR_LENGTH = 500;

/** How long a link the bot sends stays good. */
const LINK_MINUTES = 30;

/** A sender that has not answered in this long died: its message can be claimed again. */
const staleSince = sql`now() - interval '10 minutes'`;

/** A contact, with the email of the account it is linked to. */
export interface ContactWithAccount extends WhatsAppContact {
  linkedEmail: string | null;
}

/**
 * Record a message from `waId`: their profile name and the time, which opens
 * Meta's 24-hour window for replies. The contact comes back when this message
 * is new, undefined when it was recorded already (Meta delivers a webhook
 * again when it is unsure the first one arrived), so each is answered once.
 */
export async function recordInbound(input: {
  waId: string;
  profileName: string | null;
  messageId: string;
}): Promise<WhatsAppContact | undefined> {
  const [contact] = await getDb()
    .insert(whatsappContacts)
    .values({
      waId: input.waId,
      profileName: input.profileName,
      lastMessageAt: sql`now()`,
      lastMessageId: input.messageId,
    })
    .onConflictDoUpdate({
      target: whatsappContacts.waId,
      set: {
        profileName: sql`coalesce(excluded.profile_name, ${whatsappContacts.profileName})`,
        lastMessageAt: sql`now()`,
        lastMessageId: sql`excluded.last_message_id`,
        updatedAt: sql`now()`,
      },
      setWhere: sql`${whatsappContacts.lastMessageId} is distinct from excluded.last_message_id`,
    })
    .returning();
  return contact;
}

/** A contact and its account's email. */
export async function getContact(waId: string): Promise<ContactWithAccount | undefined> {
  const [row] = await getDb()
    .select({ contact: whatsappContacts, linkedEmail: users.email })
    .from(whatsappContacts)
    .leftJoin(users, eq(users.id, whatsappContacts.userId))
    .where(eq(whatsappContacts.waId, waId))
    .limit(1);
  return row ? { ...row.contact, linkedEmail: row.linkedEmail } : undefined;
}

/** The number linked to an account, if any. */
export async function getContactForUser(userId: string): Promise<WhatsAppContact | undefined> {
  const [contact] = await getDb().select().from(whatsappContacts).where(eq(whatsappContacts.userId, userId)).limit(1);
  return contact;
}

/**
 * The menu went unasked now. True when this caller may send it: none went in
 * the last 12 hours. One statement, so two messages at once send one menu.
 */
export async function claimUnaskedMenu(waId: string): Promise<boolean> {
  const rows = await getDb()
    .update(whatsappContacts)
    .set({ menuSentAt: sql`now()` })
    .where(
      and(
        eq(whatsappContacts.waId, waId),
        or(isNull(whatsappContacts.menuSentAt), lt(whatsappContacts.menuSentAt, sql`now() - interval '12 hours'`))
      )
    )
    .returning({ waId: whatsappContacts.waId });
  return rows.length > 0;
}

/**
 * Someone at the shop wrote to `waId` from the WhatsApp Business app: a
 * person is in the chat, so the bot's unasked menu waits 12 hours from now
 * (see claimUnaskedMenu). Things the customer asks the bot for still get answers.
 */
export async function notePersonReplied(waId: string): Promise<void> {
  await getDb()
    .insert(whatsappContacts)
    .values({ waId, menuSentAt: sql`now()` })
    .onConflictDoUpdate({ target: whatsappContacts.waId, set: { menuSentAt: sql`now()` } });
}

/** STOP (true) or START (false): whether order updates go to this number. */
export async function setOptedOut(waId: string, optedOut: boolean): Promise<void> {
  await getDb()
    .update(whatsappContacts)
    .set({ optedOutAt: optedOut ? sql`now()` : null })
    .where(eq(whatsappContacts.waId, waId));
}

/** The numbers among `waIds` that replied STOP. */
export async function optedOutAmong(waIds: string[]): Promise<Set<string>> {
  if (waIds.length === 0) return new Set();
  const rows = await getDb()
    .select({ waId: whatsappContacts.waId })
    .from(whatsappContacts)
    .where(and(inArray(whatsappContacts.waId, waIds), isNotNull(whatsappContacts.optedOutAt)))
    .limit(waIds.length);
  return new Set(rows.map((row) => row.waId));
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A new link for `waId` to tie the number to an account: the token for its address, good for 30 minutes. */
export async function createLinkToken(waId: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await getDb()
    .insert(whatsappLinkTokens)
    .values({ tokenHash: hashToken(token), waId, expiresAt: sql`now() + make_interval(mins => ${LINK_MINUTES})` });
  return token;
}

/** The number a link is for, while it is unused and in time. */
export async function findLinkToken(token: string): Promise<{ waId: string } | undefined> {
  const [row] = await getDb()
    .select({ waId: whatsappLinkTokens.waId })
    .from(whatsappLinkTokens)
    .where(
      and(
        eq(whatsappLinkTokens.tokenHash, hashToken(token)),
        isNull(whatsappLinkTokens.usedAt),
        gt(whatsappLinkTokens.expiresAt, sql`now()`)
      )
    )
    .limit(1);
  return row;
}

/**
 * Link the number a link is for to `userId`, using the link up. Any other
 * number on the account is let go (one each way), and the number gets order
 * updates again, since linking is asking for them. The number comes back, or
 * undefined when the link was used, has expired or never existed.
 */
export async function linkWithToken(token: string, userId: string): Promise<string | undefined> {
  return getDb().transaction(async (tx) => {
    const [used] = await tx
      .update(whatsappLinkTokens)
      .set({ usedAt: sql`now()` })
      .where(
        and(
          eq(whatsappLinkTokens.tokenHash, hashToken(token)),
          isNull(whatsappLinkTokens.usedAt),
          gt(whatsappLinkTokens.expiresAt, sql`now()`)
        )
      )
      .returning({ waId: whatsappLinkTokens.waId });
    if (!used) return undefined;
    await tx
      .update(whatsappContacts)
      .set({ userId: null, linkedAt: null })
      .where(and(eq(whatsappContacts.userId, userId), sql`${whatsappContacts.waId} <> ${used.waId}`));
    await tx
      .update(whatsappContacts)
      .set({ userId, linkedAt: sql`now()`, optedOutAt: null })
      .where(eq(whatsappContacts.waId, used.waId));
    return used.waId;
  });
}

/** Let go of the number linked to an account. */
export async function unlinkWhatsApp(userId: string): Promise<void> {
  await getDb().update(whatsappContacts).set({ userId: null, linkedAt: null }).where(eq(whatsappContacts.userId, userId));
}

/**
 * Claim an order update for sending, as claimOrderEmail does for emails: the
 * row comes back when this caller should send it, undefined when it is sent
 * or being sent. A failed one, or one stuck sending for ten minutes, can be
 * claimed again.
 */
export async function claimWhatsAppMessage(input: {
  orderId: string;
  kind: WhatsAppMessageKind;
  key: string;
  to: string;
  template: string;
}): Promise<WhatsAppMessage | undefined> {
  const [claimed] = await getDb()
    .insert(whatsappMessages)
    .values({ ...input, status: "sending" })
    .onConflictDoUpdate({
      target: [whatsappMessages.orderId, whatsappMessages.key],
      set: {
        status: "sending",
        attempts: sql`${whatsappMessages.attempts} + 1`,
        template: sql`excluded.template`,
        wamid: null,
        error: null,
        updatedAt: sql`now()`,
      },
      setWhere: or(
        eq(whatsappMessages.status, "failed"),
        and(eq(whatsappMessages.status, "sending"), lt(whatsappMessages.updatedAt, staleSince))
      ),
    })
    .returning();
  return claimed;
}

/** Meta accepted it. A status the webhook brought first (it can overtake this) is kept. */
export async function markWhatsAppSent(id: string, wamid: string): Promise<void> {
  await getDb()
    .update(whatsappMessages)
    .set({ status: sql`case when ${whatsappMessages.status} = 'sending' then 'sent'::whatsapp_message_status else ${whatsappMessages.status} end`, wamid: wamid || null, updatedAt: sql`now()` })
    .where(eq(whatsappMessages.id, id));
}

/** Meta refused it, or never answered. */
export async function markWhatsAppFailed(id: string, error: string): Promise<void> {
  await getDb()
    .update(whatsappMessages)
    .set({ status: "failed", error: error.slice(0, MAX_ERROR_LENGTH), updatedAt: sql`now()` })
    .where(eq(whatsappMessages.id, id));
}

/** What Meta's webhook says became of a message; never back from `read` to `delivered`. */
export async function applyWhatsAppStatus(update: StatusUpdate): Promise<void> {
  await getDb()
    .update(whatsappMessages)
    .set({
      status: update.status,
      ...(update.error ? { error: update.error.slice(0, MAX_ERROR_LENGTH) } : {}),
      updatedAt: sql`now()`,
    })
    .where(and(eq(whatsappMessages.wamid, update.wamid), inArray(whatsappMessages.status, statusesBefore(update.status))));
}

/** An order's WhatsApp updates, oldest first, for its admin page. */
export async function listWhatsAppMessages(orderId: string): Promise<WhatsAppMessage[]> {
  return getDb()
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.orderId, orderId))
    .orderBy(asc(whatsappMessages.createdAt), asc(whatsappMessages.id));
}
