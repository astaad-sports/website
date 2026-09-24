// Product photos are made smaller in the browser before they upload: a phone
// photo is often 5–12 MB and the server takes 4 MB at most. Drawing the photo
// again also drops its metadata, such as where it was taken. Browser-only.

import { PRODUCT_LIMITS } from "./editor";

/** What the server accepts (see storage.ts). */
const MAX_UPLOAD_BYTES = PRODUCT_LIMITS.maxPhotoBytes;

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** The formats the store accepts, for a file input's `accept`. */
export const PHOTO_ACCEPT = PHOTO_TYPES.join(",");

const PHOTO_TOO_LARGE = "This photo is too large. Use one under 4 MB.";
const PHOTO_WRONG_TYPE = "Use a JPG, PNG or WebP photo.";
const PHOTO_UNREADABLE = "This photo could not be opened. Use a JPG, PNG or WebP photo.";
const SOMETHING_WRONG = "Something went wrong. Try again.";

/** The long edge of a stored photo, enough for a sharp product page on a large screen. */
const MAX_EDGE = 2000;
const QUALITY = 0.85;

const EXTENSION: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export type ShrinkResult = { ok: true; file: File } | { ok: false; error: string };

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/** The photo as pixels, turned upright. Falls back to an <img> where createImageBitmap is missing or refuses the file. */
async function decode(file: File): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  }
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

function renamed(name: string, type: string): string {
  const base = name.replace(/\.[^.]*$/, "") || "photo";
  return `${base}.${EXTENSION[type] ?? "jpg"}`;
}

/**
 * Scale a photo so its long edge is at most 2000px and encode it as WebP at
 * 0.85. Safari cannot encode WebP (it hands back a PNG): there the photo
 * becomes a JPEG at 0.85, unless it was a PNG, which may be transparent and
 * stays a PNG. A result still over 4 MB is refused with the message to show.
 */
export async function shrinkImage(file: File): Promise<ShrinkResult> {
  if (!PHOTO_TYPES.includes(file.type)) return { ok: false, error: PHOTO_WRONG_TYPE };

  let decoded: Decoded;
  try {
    decoded = await decode(file);
  } catch {
    return { ok: false, error: PHOTO_UNREADABLE };
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    decoded.release();
    return { ok: false, error: SOMETHING_WRONG };
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(decoded.source, 0, 0, width, height);
  decoded.release();

  let blob = await encode(canvas, "image/webp");
  if (blob && blob.type !== "image/webp" && file.type !== "image/png") {
    // JPEG has no transparency: put white, not black, behind any clear pixels.
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    blob = await encode(canvas, "image/jpeg");
  }
  // Safari keeps canvas memory until the canvas shrinks.
  canvas.width = 0;
  canvas.height = 0;

  if (!blob || !EXTENSION[blob.type]) return { ok: false, error: SOMETHING_WRONG };
  if (blob.size > MAX_UPLOAD_BYTES) return { ok: false, error: PHOTO_TOO_LARGE };
  return { ok: true, file: new File([blob], renamed(file.name, blob.type), { type: blob.type }) };
}
