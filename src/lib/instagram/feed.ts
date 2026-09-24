import "server-only";

import { createHash } from "node:crypto";

import { unstable_cache } from "next/cache";
import { z } from "zod";

import { readInstagramToken, writeInstagramToken } from "@/db/instagram";

import { MEDIA_FIELDS, toInstagramPosts, type InstagramPost } from "./model";

// The Instagram API with Instagram Login, reading the store's own account.
// INSTAGRAM_ACCESS_TOKEN comes from the Meta app's dashboard (see .env.example).
const API = "https://graph.instagram.com";
const VERSION = "v25.0";

/** Seconds the feed is cached. A new post shows within this long. */
const FEED_REVALIDATE = 900;

/**
 * Tokens last 60 days from their last refresh, and Instagram refreshes only
 * tokens at least a day old, so a weekly refresh leaves plenty of slack.
 */
const REFRESH_AFTER_MS = 7 * 86_400_000;

const TIMEOUT_MS = 5_000;

/** How many posts to ask for, so a few that can't be shown still leave a full grid. */
const PAGE_SIZE = 12;

class InstagramApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: number | undefined,
    message: string
  ) {
    super(message);
  }

  /** Instagram's code for a token that is invalid, expired or revoked. Asking again won't help. */
  get badToken(): boolean {
    return this.code === 190;
  }
}

const errorBody = z.object({ error: z.object({ message: z.string().optional(), code: z.number().optional() }) });

/** A GET to the API. The token rides in the query string, so errors never include the URL. */
async function call(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(path, API);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = errorBody.safeParse(body).data?.error;
    throw new InstagramApiError(
      response.status,
      error?.code,
      `Instagram ${path} answered ${response.status}: ${error?.message ?? "no details"}`
    );
  }
  return body;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function seedToken(): string | null {
  return process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null;
}

const refreshed = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() });

/**
 * The token to read with: the stored one when it was refreshed from the
 * current INSTAGRAM_ACCESS_TOKEN, else that env token itself. About once a
 * week it is refreshed and the new one stored, so the feed outlives the env
 * token's 60 days. Without a database the env token is used as it is.
 */
async function accessToken(seed: string): Promise<string> {
  if (!process.env.DATABASE_URL) return seed;
  const seedHash = sha256(seed);
  let token = seed;
  try {
    const stored = await readInstagramToken();
    const current = stored?.seedHash === seedHash ? stored : null;
    if (current) {
      token = current.accessToken;
      if (Date.now() - current.refreshedAt.getTime() < REFRESH_AFTER_MS) return token;
    }
    const next = refreshed.parse(
      await call("/refresh_access_token", { grant_type: "ig_refresh_token", access_token: token })
    );
    const now = Date.now();
    await writeInstagramToken({
      accessToken: next.access_token,
      seedHash,
      refreshedAt: new Date(now),
      expiresAt: new Date(now + next.expires_in * 1000),
    });
    return next.access_token;
  } catch (error) {
    // A token under a day old can't be refreshed yet; the next load tries again.
    console.warn("instagram: token not refreshed:", error instanceof Error ? error.message : error);
    return token;
  }
}

/**
 * The latest posts, or null when there is no token or Instagram refused it.
 * Other failures (a timeout, an outage) throw, so they aren't cached and the
 * next request tries again.
 */
async function loadPosts(): Promise<InstagramPost[] | null> {
  const seed = seedToken();
  if (!seed) return null;
  const token = await accessToken(seed);
  try {
    const page = await call(`/${VERSION}/me/media`, {
      fields: MEDIA_FIELDS,
      limit: String(PAGE_SIZE),
      access_token: token,
    });
    return toInstagramPosts(page);
  } catch (error) {
    if (error instanceof InstagramApiError && error.badToken) {
      console.error(
        "instagram: the access token is invalid or has expired. Generate a new one and set INSTAGRAM_ACCESS_TOKEN (see .env.example).",
        error.message
      );
      return null;
    }
    throw error;
  }
}

// Keyed by the env token too, so a newly pasted token doesn't wait out a cached "no feed".
const cachedPosts = unstable_cache(loadPosts, ["instagram-posts", sha256(seedToken() ?? "").slice(0, 16)], {
  revalidate: FEED_REVALIDATE,
});

/**
 * The home page's Instagram posts, newest first, or null when the feed isn't
 * set up or can't be read right now; the section then shows Instagram's own
 * embed instead.
 */
export async function getInstagramPosts(): Promise<InstagramPost[] | null> {
  try {
    const posts = await cachedPosts();
    return posts?.length ? posts : null;
  } catch (error) {
    console.error("instagram: feed not loaded:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** A post in the current feed, by its media id. */
export async function findInstagramPost(id: string): Promise<InstagramPost | undefined> {
  return (await getInstagramPosts())?.find((post) => post.id === id);
}
