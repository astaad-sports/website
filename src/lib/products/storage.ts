import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, head, put } from "@vercel/blob";

import { imageSize } from "@/lib/image-size";

import { PRODUCT_LIMITS } from "./editor";
import {
  isVideoUploadPathname,
  MAX_VIDEO_BYTES,
  sniffVideo,
  STORED_VIDEO_TYPES,
  VIDEO_FILE_PATTERN,
  type StoredVideoType,
} from "./videos";

// Uploaded photos: product photos, and review photos from customers and the
// admin. With BLOB_READ_WRITE_TOKEN set they go to Vercel Blob; on a machine
// without it (local development) they are kept in .uploads/ and served by
// src/app/uploads/<folder>/[file]/route.ts. On Vercel without a token,
// uploading is refused with a message saying what to set up.

/** The formats accepted, with the extension each is stored under. */
const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
type ImageType = keyof typeof IMAGE_TYPES;

/** Where a photo is kept: a folder in the Blob store (and in .uploads/). */
export type ImageFolder = "products" | "reviews";

/** The browser shrinks photos before upload, so a real one is well under this. */
const MAX_IMAGE_BYTES = PRODUCT_LIMITS.maxPhotoBytes;

const localDir = (folder: ImageFolder) => path.join(process.cwd(), ".uploads", folder);
const localUrlPrefix = (folder: ImageFolder) => `/uploads/${folder}/`;
/** Names the local store writes, and the only ones its routes serve. */
export const LOCAL_FILE_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type StoredImage = { url: string; pathname: string; width: number | null; height: number | null };

export type StoreImageResult =
  | { ok: true; image: StoredImage }
  | { ok: false; error: string };

/** Where uploads go here: the Blob store, the local folder, or nowhere (Vercel without a token). */
export function storage(): "blob" | "local" | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  // Vercel's file system is read-only, so there is nowhere local to keep them.
  if (process.env.VERCEL) return null;
  return "local";
}

/** The type the file's first bytes say it is, whatever its name claims. */
function sniff(bytes: Uint8Array): ImageType | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Save an uploaded photo under a new random name in `folder`. */
export async function storeImage(file: unknown, folder: ImageFolder = "products"): Promise<StoreImageResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a photo to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "This photo is too large. Use one under 4 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return { ok: false, error: "Use a JPG, PNG or WebP photo." };
  const size = imageSize(bytes, type);

  const where = storage();
  if (!where) {
    return { ok: false, error: "Photo storage is not set up. Connect a Vercel Blob store to the project, then try again." };
  }

  const name = `${randomUUID()}.${IMAGE_TYPES[type]}`;
  const dimensions = { width: size?.width ?? null, height: size?.height ?? null };
  try {
    if (where === "blob") {
      const blob = await put(`${folder}/${name}`, Buffer.from(bytes), {
        access: "public",
        contentType: type,
        // The name is already random; keep the URL stable for a year of caching.
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      return { ok: true, image: { url: blob.url, pathname: blob.pathname, ...dimensions } };
    }
    await mkdir(localDir(folder), { recursive: true });
    await writeFile(path.join(localDir(folder), name), bytes);
    return { ok: true, image: { url: `${localUrlPrefix(folder)}${name}`, pathname: `${folder}/${name}`, ...dimensions } };
  } catch (error) {
    console.error(`Storing a photo in ${folder} failed`, error);
    return { ok: false, error: "The photo could not be saved. Try again." };
  }
}

/**
 * Delete an uploaded photo's file. The photos that ship with the site (no
 * pathname) are left alone. A failure is logged, not raised: the photo is
 * already gone from its product or review.
 */
export async function removeStoredImage(image: { url: string; pathname: string | null }): Promise<void> {
  if (!image.pathname) return;
  try {
    const folder = (["products", "reviews"] as const).find((entry) => image.url.startsWith(localUrlPrefix(entry)));
    if (folder) {
      const name = image.url.slice(localUrlPrefix(folder).length);
      if (LOCAL_FILE_PATTERN.test(name)) await unlink(path.join(localDir(folder), name));
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(image.url);
    }
  } catch (error) {
    console.error("Removing a photo file failed", error);
  }
}

/** A photo from the local store, for its route, or null. */
export async function readLocalImage(
  name: string,
  folder: ImageFolder = "products"
): Promise<{ bytes: Buffer; type: ImageType } | null> {
  if (!LOCAL_FILE_PATTERN.test(name)) return null;
  try {
    const bytes = await readFile(path.join(localDir(folder), name));
    const type = sniff(bytes);
    return type ? { bytes, type } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Videos. Too large to pass through a function (Vercel caps a request at
// 4.5 MB), so with Blob the admin's browser uploads them straight to the
// store (see src/app/api/admin/product-videos/route.ts) and the server only
// checks the result. Locally they go to .uploads/videos/ through that route.

const LOCAL_VIDEO_DIR = path.join(process.cwd(), ".uploads", "videos");
const LOCAL_VIDEO_PREFIX = "/uploads/videos/";

export type StoredVideo = { url: string; pathname: string };

/** Save a video sent to this machine (local development only), under a new random name. */
export async function storeLocalVideo(
  body: ReadableStream<Uint8Array> | null
): Promise<{ ok: true; video: StoredVideo } | { ok: false; error: string }> {
  if (storage() !== "local") return { ok: false, error: "Videos upload straight to the Blob store here." };
  if (!body) return { ok: false, error: "Choose a video to upload." };
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = body.getReader();
  for (let read = await reader.read(); !read.done; read = await reader.read()) {
    size += read.value.byteLength;
    if (size > MAX_VIDEO_BYTES) {
      await reader.cancel();
      return { ok: false, error: "This video is too large." };
    }
    chunks.push(read.value);
  }
  const bytes = Buffer.concat(chunks);
  const type = sniffVideo(bytes);
  if (!type) return { ok: false, error: "Use an MP4, MOV or WebM video." };
  const name = `${randomUUID()}.${STORED_VIDEO_TYPES[type]}`;
  try {
    await mkdir(LOCAL_VIDEO_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_VIDEO_DIR, name), bytes);
  } catch (error) {
    console.error("Storing a video locally failed", error);
    return { ok: false, error: "The video could not be saved. Try again." };
  }
  return { ok: true, video: { url: `${LOCAL_VIDEO_PREFIX}${name}`, pathname: `videos/${name}` } };
}

/**
 * Whether `video` is an upload of ours that is really there: a random name in
 * the videos folder of this Blob store (or of .uploads/videos/ locally), of a
 * video type and within the size limit.
 */
export async function isStoredVideo(video: StoredVideo): Promise<boolean> {
  const where = storage();
  if (where === "local") {
    const name = video.url.slice(LOCAL_VIDEO_PREFIX.length);
    const ours = video.url.startsWith(LOCAL_VIDEO_PREFIX) && VIDEO_FILE_PATTERN.test(name) && video.pathname === `videos/${name}`;
    return ours && (await readLocalVideo(name)) !== null;
  }
  if (where !== "blob" || !isVideoUploadPathname(video.pathname)) return false;
  try {
    // Only this store's token can read it, so a URL from elsewhere fails here.
    const blob = await head(video.url);
    return (
      blob.pathname === video.pathname &&
      blob.contentType in STORED_VIDEO_TYPES &&
      blob.size > 0 &&
      blob.size <= MAX_VIDEO_BYTES
    );
  } catch {
    return false;
  }
}

/** Delete a video's file. A failure is logged, not raised: the video is already gone from its product. */
export async function removeStoredVideo(video: { url: string; pathname: string | null }): Promise<void> {
  if (!video.pathname) return;
  try {
    if (video.url.startsWith(LOCAL_VIDEO_PREFIX)) {
      const name = video.url.slice(LOCAL_VIDEO_PREFIX.length);
      if (VIDEO_FILE_PATTERN.test(name)) await unlink(path.join(LOCAL_VIDEO_DIR, name));
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(video.url);
    }
  } catch (error) {
    console.error("Removing a video file failed", error);
  }
}

/** A video from the local store, for its route, or null. */
export async function readLocalVideo(name: string): Promise<{ bytes: Buffer; type: StoredVideoType } | null> {
  if (!VIDEO_FILE_PATTERN.test(name)) return null;
  try {
    const bytes = await readFile(path.join(LOCAL_VIDEO_DIR, name));
    const type = sniffVideo(bytes);
    return type ? { bytes, type } : null;
  } catch {
    return null;
  }
}
