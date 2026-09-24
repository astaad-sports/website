import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";

import { PRODUCT_LIMITS } from "./editor";

// Product photos. With BLOB_READ_WRITE_TOKEN set they go to Vercel Blob;
// on a machine without it (local development) they are kept in .uploads/ and
// served by src/app/uploads/products/[file]/route.ts. On Vercel without a
// token, uploading is refused with a message saying what to set up.

/** The formats accepted, with the extension each is stored under. */
const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
type ImageType = keyof typeof IMAGE_TYPES;

/** The browser shrinks photos before upload, so a real one is well under this. */
const MAX_IMAGE_BYTES = PRODUCT_LIMITS.maxPhotoBytes;

const LOCAL_DIR = path.join(process.cwd(), ".uploads", "products");
const LOCAL_URL_PREFIX = "/uploads/products/";
/** Names the local store writes, and the only ones its route serves. */
export const LOCAL_FILE_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type StoredImage = { url: string; pathname: string };

export type StoreImageResult =
  | { ok: true; image: StoredImage }
  | { ok: false; error: string };

function storage(): "blob" | "local" | null {
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

/** Save an uploaded photo under a new random name. */
export async function storeImage(file: unknown): Promise<StoreImageResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a photo to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "This photo is too large. Use one under 4 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return { ok: false, error: "Use a JPG, PNG or WebP photo." };

  const where = storage();
  if (!where) {
    return { ok: false, error: "Photo storage is not set up. Connect a Vercel Blob store to the project, then try again." };
  }

  const name = `${randomUUID()}.${IMAGE_TYPES[type]}`;
  try {
    if (where === "blob") {
      const blob = await put(`products/${name}`, Buffer.from(bytes), {
        access: "public",
        contentType: type,
        // The name is already random; keep the URL stable for a year of caching.
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      return { ok: true, image: { url: blob.url, pathname: blob.pathname } };
    }
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, name), bytes);
    return { ok: true, image: { url: `${LOCAL_URL_PREFIX}${name}`, pathname: `products/${name}` } };
  } catch (error) {
    console.error("Storing a product photo failed", error);
    return { ok: false, error: "The photo could not be saved. Try again." };
  }
}

/**
 * Delete an uploaded photo's file. The photos that ship with the site (no
 * pathname) are left alone. A failure is logged, not raised: the photo is
 * already gone from the product.
 */
export async function removeStoredImage(image: { url: string; pathname: string | null }): Promise<void> {
  if (!image.pathname) return;
  try {
    if (image.url.startsWith(LOCAL_URL_PREFIX)) {
      const name = image.url.slice(LOCAL_URL_PREFIX.length);
      if (LOCAL_FILE_PATTERN.test(name)) await unlink(path.join(LOCAL_DIR, name));
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(image.url);
    }
  } catch (error) {
    console.error("Removing a product photo file failed", error);
  }
}

/** A photo from the local store, for its route, or null. */
export async function readLocalImage(name: string): Promise<{ bytes: Buffer; type: ImageType } | null> {
  if (!LOCAL_FILE_PATTERN.test(name)) return null;
  try {
    const bytes = await readFile(path.join(LOCAL_DIR, name));
    const type = sniff(bytes);
    return type ? { bytes, type } : null;
  } catch {
    return null;
  }
}
