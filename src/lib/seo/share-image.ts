import "server-only";

import sharp from "sharp";

import { SHARE_IMAGE_SIZE } from "./metadata";

/** The store's light plate (`--surface-sunken`), behind the cut-out. */
const PLATE = "#f5f5f5";
/** Clear space around the product, in pixels. */
const MARGIN = 48;
/** A cut-out this many times taller than wide is a bat standing upright. */
const UPRIGHT = 2.5;
/** How far an upright bat is turned, in degrees, to lie across the wide frame. */
const SLANT = 62;

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * A product photo as the 1200x630 JPEG a shared link shows. Product photos
 * are transparent WebP cut-outs, which previews draw on black or not at all
 * (Next's own image renderer cannot read WebP either): the cut-out is
 * trimmed, laid on the plate and, for a bat standing upright, turned to fill
 * the frame. A photo with a background of its own fills the frame as it is.
 */
export async function shareImage(photo: Buffer): Promise<Buffer> {
  const { width, height } = SHARE_IMAGE_SIZE;
  const { hasAlpha } = await sharp(photo).metadata();
  if (!hasAlpha) {
    return sharp(photo).resize({ width, height, fit: "cover" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  }

  let cut = await sharp(photo).trim().png().toBuffer({ resolveWithObject: true });
  if (cut.info.height > cut.info.width * UPRIGHT) {
    cut = await sharp(cut.data).rotate(SLANT, { background: CLEAR }).png().toBuffer({ resolveWithObject: true });
  }
  const fitted = await sharp(cut.data)
    .resize({ width: width - MARGIN * 2, height: height - MARGIN * 2, fit: "inside" })
    .png()
    .toBuffer();
  return sharp({ create: { width, height, channels: 3, background: PLATE } })
    .composite([{ input: fitted, gravity: "centre" }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
