import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";

import { getProductById } from "@/db/products";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { storage, storeLocalVideo } from "@/lib/products/storage";
import { isVideoUploadPathname, MAX_VIDEO_BYTES, STORED_VIDEO_TYPES } from "@/lib/products/videos";

const ONE_YEAR = 60 * 60 * 24 * 365;

const refuse = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Product video uploads from the admin's editor, admins only. With Vercel
 * Blob, the browser asks here for a one-time token and then sends the file
 * straight to the store, since a video is far past the 4.5 MB a function
 * accepts (POST, from upload() in @vercel/blob/client). The file only
 * becomes a product's video once addVideo has checked it.
 */
export async function POST(request: Request) {
  if (!isAdmin(await getCurrentUser())) return refuse("Only store admins can upload videos. Sign in again.", 403);
  if (storage() !== "blob")
    return refuse("Video storage is not set up. Connect a Vercel Blob store to the project.", 503);

  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const productId = z.uuid().safeParse(clientPayload);
        if (!isVideoUploadPathname(pathname) || !productId.success) throw new Error("Not a product video");
        if (!(await getProductById(productId.data))) throw new Error("This product no longer exists.");
        return {
          allowedContentTypes: Object.keys(STORED_VIDEO_TYPES),
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          // The name is already random; keep the URL stable for a year of caching.
          addRandomSuffix: false,
          cacheControlMaxAge: ONE_YEAR,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return refuse(error instanceof Error ? error.message : "The upload could not start.", 400);
  }
}

/**
 * On a machine without Vercel Blob (local development), the video itself:
 * kept in .uploads/videos/, answering its address.
 */
export async function PUT(request: Request) {
  if (!isAdmin(await getCurrentUser())) return refuse("Only store admins can upload videos. Sign in again.", 403);
  const stored = await storeLocalVideo(request.body);
  if (!stored.ok) return refuse(stored.error, 400);
  return Response.json(stored.video);
}
