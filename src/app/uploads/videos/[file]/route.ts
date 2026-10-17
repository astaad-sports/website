import { readLocalVideo } from "@/lib/products/storage";

/**
 * Product videos uploaded on a machine without Vercel Blob (see
 * src/lib/products/storage.ts). Answers byte ranges, which Safari needs to
 * play a video at all. Each name is random and never reused, so the file can
 * be cached for good.
 */
export async function GET(request: Request, { params }: RouteContext<"/uploads/videos/[file]">) {
  const { file } = await params;
  const video = await readLocalVideo(file);
  if (!video) return new Response("Not found", { status: 404 });
  const size = video.bytes.byteLength;
  const headers = {
    "Content-Type": video.type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (!range || (!range[1] && !range[2])) {
    return new Response(new Uint8Array(video.bytes), {
      headers: { ...headers, "Content-Length": String(size) },
    });
  }
  // "bytes=500-" from 500 to the end, "bytes=-500" the last 500.
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }
  return new Response(new Uint8Array(video.bytes.subarray(start, end + 1)), {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
    },
  });
}
