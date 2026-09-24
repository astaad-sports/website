import { findInstagramPost } from "@/lib/instagram/feed";

/** Instagram's image hosts; the API's URLs are all on these. */
const CDN_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

/**
 * A home-page Instagram post's picture, for the image optimizer. Only posts
 * in the current feed are served, so the optimizer can't be pointed at
 * anything else, and visitors' browsers never contact Instagram. Instagram's
 * own URLs are signed and change; this one stays the same for a post.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/instagram/[id]">) {
  const { id } = await params;
  const post = /^\d+$/.test(id) ? await findInstagramPost(id) : undefined;
  if (!post || !CDN_HOST.test(new URL(post.image).hostname)) return new Response("Not found", { status: 404 });

  const upstream = await fetch(post.image, { cache: "no-store", signal: AbortSignal.timeout(10_000) }).catch(
    () => null
  );
  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream?.ok || !upstream.body || !type.startsWith("image/")) {
    return new Response("Instagram did not send the picture", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      // A post's picture doesn't change, so the optimizer can keep its copy.
      "Cache-Control": "public, max-age=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
