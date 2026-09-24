// The store's Instagram account and its posts as the home page shows them.
// Pure and client-safe; fetching and the access token live in ./feed.ts.
import { z } from "zod";

export const INSTAGRAM_HANDLE = "astaad.sports";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;

/** How many posts the home page shows: eight from lg, six below. */
export const FEED_SIZE = 8;

export type InstagramPostKind = "photo" | "carousel" | "reel" | "video";

export interface InstagramPost {
  /** Instagram's media id, digits only. */
  id: string;
  kind: InstagramPostKind;
  /** The post on Instagram. */
  href: string;
  /** The photo, the first photo of a carousel, or a video's cover, on Instagram's CDN. */
  image: string;
  /** The caption's first line, readable, for labels. Empty when there is none. */
  label: string;
  /** ISO time it was posted. */
  postedAt: string;
}

// ---------------------------------------------------------------------------
// The Instagram API's media objects (graph.instagram.com, me/media)

const child = z.object({
  media_type: z.string(),
  media_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
});

export const mediaSchema = z.object({
  id: z.string().regex(/^\d+$/),
  media_type: z.string(),
  /** Missing when the post uses copyrighted material. For a video it is the video file. */
  media_url: z.string().optional(),
  /** A video's cover image. */
  thumbnail_url: z.string().optional(),
  media_product_type: z.string().optional(),
  permalink: z.string(),
  caption: z.string().optional(),
  timestamp: z.string(),
  children: z.object({ data: z.array(child) }).optional(),
});

export type InstagramMedia = z.infer<typeof mediaSchema>;

export const mediaPageSchema = z.object({ data: z.array(z.unknown()) });

/** The fields the feed asks for, in Graph API field syntax. */
export const MEDIA_FIELDS =
  "id,media_type,media_url,thumbnail_url,media_product_type,permalink,caption,timestamp,children{media_type,media_url,thumbnail_url}";

function isHttps(url: string | undefined): url is string {
  return Boolean(url?.startsWith("https://"));
}

/** A still image for a media object or carousel child: a photo's own URL, a video's cover. */
function stillOf(media: { media_type: string; media_url?: string; thumbnail_url?: string }): string | null {
  const url = media.media_type === "VIDEO" ? media.thumbnail_url : media.media_url;
  return isHttps(url) ? url : null;
}

/**
 * A caption as a short label: its first line, with the styled letters people
 * paste in ("𝑻𝒉𝒆 𝑴𝒂𝒔𝒕𝒆𝒓") turned back into plain ones so screen readers can
 * read them, hashtags dropped, and cut at a word near 100 characters.
 */
export function captionLabel(caption: string | undefined): string {
  if (!caption) return "";
  const line =
    caption
      .normalize("NFKC")
      .split("\n")
      .map((text) => text.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim())
      .find((text) => /[\p{L}\p{N}]/u.test(text)) ?? "";
  if (line.length <= 100) return line;
  const cut = line.slice(0, 100);
  const space = cut.lastIndexOf(" ");
  return `${(space > 60 ? cut.slice(0, space) : cut).replace(/[\s,.;:!?-]+$/u, "")}…`;
}

/**
 * One API media object as a post to show, or null when it has no picture to
 * show (copyrighted, or a type the grid doesn't know) or isn't on the profile
 * grid (stories and ads).
 */
export function toInstagramPost(value: unknown): InstagramPost | null {
  const parsed = mediaSchema.safeParse(value);
  if (!parsed.success) return null;
  const media = parsed.data;
  if (media.media_product_type && !["FEED", "REELS"].includes(media.media_product_type)) return null;
  if (!isHttps(media.permalink)) return null;

  let kind: InstagramPostKind;
  let image: string | null;
  switch (media.media_type) {
    case "IMAGE":
      kind = "photo";
      image = stillOf(media);
      break;
    case "VIDEO":
      kind = media.media_product_type === "REELS" ? "reel" : "video";
      image = stillOf(media);
      break;
    case "CAROUSEL_ALBUM": {
      kind = "carousel";
      const first = media.children?.data[0];
      // Without its children, an album's own URL is its first item's, which can be a video file.
      const own = isHttps(media.media_url) && !new URL(media.media_url).pathname.endsWith(".mp4") ? media.media_url : null;
      image = first ? stillOf(first) : own;
      break;
    }
    default:
      return null;
  }
  if (!image) return null;

  return {
    id: media.id,
    kind,
    href: media.permalink,
    image,
    label: captionLabel(media.caption),
    postedAt: media.timestamp,
  };
}

/** The posts to show from one page of me/media, newest first as the API sends them. */
export function toInstagramPosts(page: unknown, limit = FEED_SIZE): InstagramPost[] {
  const parsed = mediaPageSchema.safeParse(page);
  if (!parsed.success) return [];
  return parsed.data.data.flatMap((item) => toInstagramPost(item) ?? []).slice(0, limit);
}

const KIND_NAME: Record<InstagramPostKind, string> = {
  photo: "Photo",
  carousel: "Photos",
  reel: "Reel",
  video: "Video",
};

/** What a tile's link says to a screen reader: "Reel on Instagram: New English willow…". */
export function postLinkLabel(post: Pick<InstagramPost, "kind" | "label">): string {
  const kind = `${KIND_NAME[post.kind]} on Instagram`;
  return post.label ? `${kind}: ${post.label}` : kind;
}
