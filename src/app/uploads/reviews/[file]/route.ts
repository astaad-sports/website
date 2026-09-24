import { readLocalImage } from "@/lib/products/storage";

/**
 * Review photos uploaded on a machine without Vercel Blob (see
 * src/lib/products/storage.ts). Each name is random and never reused, so
 * the file can be cached for good.
 */
export async function GET(_request: Request, { params }: RouteContext<"/uploads/reviews/[file]">) {
  const { file } = await params;
  const image = await readLocalImage(file, "reviews");
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
