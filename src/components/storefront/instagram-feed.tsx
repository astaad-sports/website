import Image from "next/image";
import { Suspense } from "react";
import { Images, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getInstagramPosts } from "@/lib/instagram/feed";
import {
  FEED_SIZE,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  postLinkLabel,
  type InstagramPost,
} from "@/lib/instagram/model";
import { cn } from "@/lib/utils";

import { InstagramEmbed } from "./instagram-embed";
import { InstagramGlyph } from "./instagram-glyph";
import { SectionHeading } from "./section-heading";

/** A row to swipe on phones (all eight posts), three columns from md (six), four from lg (eight). */
const GRID =
  "no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4";
const CELL = "w-[150px] shrink-0 snap-start md:w-auto";
const TILE = "relative block aspect-[4/5] overflow-hidden rounded-xs bg-surface-sunken";
const SHOWN_FROM_MD = 6;

function tileVisibility(index: number): string {
  return cn(CELL, index >= SHOWN_FROM_MD && "md:hidden lg:block");
}

function KindMark({ kind }: { kind: InstagramPost["kind"] }) {
  if (kind === "photo") return null;
  const Icon = kind === "carousel" ? Images : Play;
  return (
    <span aria-hidden="true" className="absolute top-2.5 right-2.5 text-on-dark drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
      <Icon className={cn("size-5", kind !== "carousel" && "fill-current")} strokeWidth={1.75} />
    </span>
  );
}

function PostTile({ post }: { post: InstagramPost }) {
  return (
    <a
      href={post.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={postLinkLabel(post)}
      className={cn(
        TILE,
        "group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
      )}
    >
      <Image
        src={`/api/instagram/${post.id}`}
        alt=""
        fill
        sizes="(min-width: 1440px) 344px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 150px"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-surface-dark/0 transition-colors group-hover:bg-surface-dark/20"
      />
      <KindMark kind={post.kind} />
    </a>
  );
}

/** Blank tiles while the posts load. */
function PostsPlaceholder() {
  return (
    <ul aria-hidden="true" className={GRID}>
      {Array.from({ length: FEED_SIZE }, (_, index) => (
        <li key={index} className={cn(TILE, tileVisibility(index))} />
      ))}
    </ul>
  );
}

/**
 * The latest posts in the store's own grid, or Instagram's embed until the feed
 * is set up. On phones the embed is cut to its profile card and first rows of
 * posts, fading out at the foot (the Follow button above opens the rest).
 */
async function InstagramPosts() {
  const posts = await getInstagramPosts();
  if (!posts) {
    return (
      <div className="relative max-md:max-h-[540px] max-md:overflow-hidden">
        <InstagramEmbed />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-surface to-transparent md:hidden"
        />
      </div>
    );
  }
  return (
    <ul aria-label={`Latest posts from @${INSTAGRAM_HANDLE}`} className={GRID}>
      {posts.map((post, index) => (
        <li key={post.id} className={tileVisibility(index)}>
          <PostTile post={post} />
        </li>
      ))}
    </ul>
  );
}

/**
 * "Straight from the workshop.": the store's latest Instagram posts and a
 * Follow button. The posts stream in after the rest of the page.
 */
export function InstagramFeed() {
  return (
    <section id="instagram" aria-labelledby="instagram-title" className="bg-surface">
      <div className="site-shell flex flex-col gap-5 py-8 md:gap-8 md:py-20">
        <SectionHeading
          id="instagram-title"
          compact
          eyebrow="Instagram"
          title="Straight from the workshop."
          aside={
            <div className="flex flex-col items-start gap-4 md:items-end">
              <p className="max-w-[340px] text-sm leading-5 text-ink-muted md:text-right md:text-[15px] md:leading-[22px]">
                New bats off the bench, reels from the shop and players with their Astaad. Tag @{INSTAGRAM_HANDLE}{" "}
                in yours.
              </p>
              <Button
                render={<a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" />}
                nativeButton={false}
              >
                <InstagramGlyph className="size-5" />
                Follow @{INSTAGRAM_HANDLE}
                <span className="sr-only"> (opens Instagram)</span>
              </Button>
            </div>
          }
        />
        <Suspense fallback={<PostsPlaceholder />}>
          <InstagramPosts />
        </Suspense>
      </div>
    </section>
  );
}
