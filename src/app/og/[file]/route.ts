import { getStoreCatalogue } from "@/lib/products/catalogue";
import { shareImage } from "@/lib/seo/share-image";
import { realPhotos } from "@/lib/seo/structured-data";
import { absoluteUrl } from "@/lib/site";

// With this, each picture is made on its first request and kept, instead of
// the photo being fetched and redrawn for every preview. It is kept as long
// as the catalogue's cache (five minutes, then remade in the background), and
// a change in the admin clears it at once (see productsChanged).
export function generateStaticParams() {
  return [];
}

/**
 * /og/<slug>.jpg: the picture a shared product link shows, made from the
 * product's first photo (see productShareImage and shareImage). Only products
 * the public can see, with a photo of their own, have one.
 */
export async function GET(_request: Request, { params }: RouteContext<"/og/[file]">) {
  const { file } = await params;
  const slug = file.replace(/\.jpg$/, "");
  const { bats, gear } = await getStoreCatalogue();
  const product = bats.find((bat) => bat.slug === slug) ?? gear.find((item) => item.slug === slug);
  const photo = product && realPhotos(product.images)[0];
  if (!photo) return new Response("Not found", { status: 404 });

  // A failure throws, so it is never kept in place of the picture.
  const source = await fetch(absoluteUrl(photo), { signal: AbortSignal.timeout(10_000) });
  if (!source.ok) throw new Error(`The photo of ${slug} could not be read (${source.status}).`);
  const jpeg = await shareImage(Buffer.from(await source.arrayBuffer()));

  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff" },
  });
}
