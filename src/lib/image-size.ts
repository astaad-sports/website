// The pixel size of a JPEG, PNG or WebP, read from its header, so a review
// photo's card can be drawn at its shape before the photo loads. Pure, so
// server and tests use it alike.

export interface ImageSize {
  width: number;
  height: number;
}

const be16 = (bytes: Uint8Array, at: number) => (bytes[at] << 8) | bytes[at + 1];
const be32 = (bytes: Uint8Array, at: number) => ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
const le16 = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8);
const le24 = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));

function pngSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 24 || ascii(bytes, 12, 16) !== "IHDR") return null;
  return { width: be32(bytes, 16), height: be32(bytes, 20) };
}

/** The first start-of-frame marker holds the size; every other segment is skipped by its length. */
function jpegSize(bytes: Uint8Array): ImageSize | null {
  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1];
    // Fill bytes before a marker.
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC), which share the range.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: be16(bytes, at + 7), height: be16(bytes, at + 5) };
    }
    at += 2 + be16(bytes, at + 2);
  }
  return null;
}

function webpSize(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 30) return null;
  const chunk = ascii(bytes, 12, 16);
  if (chunk === "VP8X") return { width: 1 + le24(bytes, 24), height: 1 + le24(bytes, 27) };
  if (chunk === "VP8 ") return { width: le16(bytes, 26) & 0x3fff, height: le16(bytes, 28) & 0x3fff };
  if (chunk === "VP8L") {
    const [b0, b1, b2, b3] = bytes.subarray(21, 25);
    return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  return null;
}

/** The size in pixels, or null when the header can't be read. */
export function imageSize(bytes: Uint8Array, type: "image/jpeg" | "image/png" | "image/webp"): ImageSize | null {
  const size = type === "image/png" ? pngSize(bytes) : type === "image/jpeg" ? jpegSize(bytes) : webpSize(bytes);
  return size && size.width > 0 && size.height > 0 ? size : null;
}
