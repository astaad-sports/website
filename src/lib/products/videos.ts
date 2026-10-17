// Product videos: the rules the admin's browser and the server share. The
// files are uploaded as they are, with no re-encoding, so the help text asks
// for MP4 in H.264, which every browser plays.

import { PRODUCT_LIMITS } from "./editor";

/** What the file picker offers. */
export const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

/**
 * How each accepted format is stored. A .mov from a phone is the same kind of
 * file as an MP4, and browsers play it as one, so it is kept as one.
 */
export const STORED_VIDEO_TYPES = { "video/mp4": "mp4", "video/webm": "webm" } as const;
export type StoredVideoType = keyof typeof STORED_VIDEO_TYPES;

export const MAX_VIDEO_BYTES = PRODUCT_LIMITS.maxVideoBytes;
export const MAX_VIDEO_MB = MAX_VIDEO_BYTES / 1024 / 1024;

/** A stored video's name: random, never reused. */
export const VIDEO_FILE_PATTERN = /^[0-9a-f-]{36}\.(mp4|webm)$/;
/** Where videos go in the Blob store. */
export const BLOB_VIDEO_FOLDER = "products/videos";

/** The stored type for a chosen file, from its type or else its extension; null for anything else. */
export function storedVideoType(file: { name: string; type: string }): StoredVideoType | null {
  const extension = file.name.toLowerCase().split(".").pop();
  if (file.type === "video/webm" || (!file.type && extension === "webm")) return "video/webm";
  if (["video/mp4", "video/quicktime"].includes(file.type)) return "video/mp4";
  if (!file.type && (extension === "mp4" || extension === "mov" || extension === "m4v")) return "video/mp4";
  return null;
}

/** Why a chosen file can't be uploaded as a video, or null when it can. */
export function videoProblem(file: { name: string; type: string; size: number }): string | null {
  if (!storedVideoType(file)) return "Use an MP4, MOV or WebM video.";
  if (file.size === 0) return "This video is empty.";
  if (file.size > MAX_VIDEO_BYTES)
    return `This video is too large. Use one under ${MAX_VIDEO_MB} MB, or a shorter clip.`;
  return null;
}

/** The type a video's first bytes say it is: an MP4 (or a .mov, the same kind of file) or a WebM. */
export function sniffVideo(bytes: Uint8Array): StoredVideoType | null {
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "video/webm";
  const box = String.fromCharCode(...bytes.subarray(4, 8));
  if (["ftyp", "moov", "mdat", "wide", "free"].includes(box)) return "video/mp4";
  return null;
}

/** The Blob pathname a browser may upload a video to: a random name in the videos folder. */
export function isVideoUploadPathname(pathname: string): boolean {
  const slash = pathname.lastIndexOf("/");
  return pathname.slice(0, slash) === BLOB_VIDEO_FOLDER && VIDEO_FILE_PATTERN.test(pathname.slice(slash + 1));
}
