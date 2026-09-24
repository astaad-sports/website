import { describe, expect, test } from "bun:test";

import { captionLabel, postLinkLabel, toInstagramPost, toInstagramPosts } from "./model";

const CDN = "https://scontent-del1-1.cdninstagram.com/v/t51.2885-15/1_n.jpg?stp=dst-jpg&oe=6700";

function media(overrides: Record<string, unknown> = {}) {
  return {
    id: "17900000000000001",
    media_type: "IMAGE",
    media_url: CDN,
    media_product_type: "FEED",
    permalink: "https://www.instagram.com/p/ABC123/",
    caption: "New English willow in the shop",
    timestamp: "2026-09-20T10:00:00+0000",
    ...overrides,
  };
}

describe("toInstagramPost", () => {
  test("a photo uses its own image", () => {
    expect(toInstagramPost(media())).toEqual({
      id: "17900000000000001",
      kind: "photo",
      href: "https://www.instagram.com/p/ABC123/",
      image: CDN,
      label: "New English willow in the shop",
      postedAt: "2026-09-20T10:00:00+0000",
    });
  });

  test("a reel uses its cover, not the video file", () => {
    const post = toInstagramPost(
      media({
        media_type: "VIDEO",
        media_product_type: "REELS",
        media_url: "https://scontent.cdninstagram.com/o1/v/t16/f2/m86/video.mp4?oe=1",
        thumbnail_url: CDN,
      })
    );
    expect(post?.kind).toBe("reel");
    expect(post?.image).toBe(CDN);
  });

  test("a feed video is a video", () => {
    expect(toInstagramPost(media({ media_type: "VIDEO", thumbnail_url: CDN }))?.kind).toBe("video");
  });

  test("a carousel uses its first item's still", () => {
    const post = toInstagramPost(
      media({
        media_type: "CAROUSEL_ALBUM",
        media_url: "https://scontent.cdninstagram.com/v/first.mp4?oe=1",
        children: { data: [{ media_type: "VIDEO", media_url: "https://x.cdninstagram.com/v.mp4", thumbnail_url: CDN }] },
      })
    );
    expect(post).toMatchObject({ kind: "carousel", image: CDN });
  });

  test("a carousel without children never shows a video file", () => {
    expect(toInstagramPost(media({ media_type: "CAROUSEL_ALBUM", media_url: "https://x.cdninstagram.com/v/a.mp4?oe=1" }))).toBeNull();
    expect(toInstagramPost(media({ media_type: "CAROUSEL_ALBUM" }))?.image).toBe(CDN);
  });

  test("posts with nothing to show are skipped", () => {
    // Copyrighted media comes without media_url.
    expect(toInstagramPost(media({ media_url: undefined }))).toBeNull();
    expect(toInstagramPost(media({ media_type: "VIDEO", thumbnail_url: undefined }))).toBeNull();
    expect(toInstagramPost(media({ media_url: "http://insecure.example/1.jpg" }))).toBeNull();
    expect(toInstagramPost(media({ media_product_type: "STORY" }))).toBeNull();
    expect(toInstagramPost(media({ media_type: "AUDIO" }))).toBeNull();
    expect(toInstagramPost(media({ id: "../../etc" }))).toBeNull();
    expect(toInstagramPost({ id: "1" })).toBeNull();
  });
});

describe("toInstagramPosts", () => {
  test("keeps the API's order, skips unusable posts and stops at the limit", () => {
    const page = {
      data: [
        media({ id: "1" }),
        media({ id: "2", media_url: undefined }),
        media({ id: "3" }),
        media({ id: "4" }),
      ],
      paging: { cursors: {} },
    };
    expect(toInstagramPosts(page, 2).map((post) => post.id)).toEqual(["1", "3"]);
  });

  test("an unexpected response is an empty feed", () => {
    expect(toInstagramPosts({ error: { code: 190 } })).toEqual([]);
    expect(toInstagramPosts(null)).toEqual([]);
  });
});

describe("captionLabel", () => {
  test("plain letters from styled ones, hashtags dropped, first line with words", () => {
    expect(captionLabel("🏏𝑻𝒉𝒆 𝑴𝒂𝒔𝒕𝒆𝒓 𝑶𝒇 𝑪𝒓𝒊𝒄𝒌𝒆𝒕 𝑩𝒂𝒕𝒔🏏\nEnglish willow")).toBe("🏏The Master Of Cricket Bats🏏");
    expect(captionLabel("#cricket #bats\n\nGrade 1 English willow #astaad")).toBe("Grade 1 English willow");
    expect(captionLabel("🔥🔥\nIn stock now")).toBe("In stock now");
  });

  test("long captions are cut at a word", () => {
    const label = captionLabel(`${"Knocked in and ready for the season ".repeat(5)}end`);
    expect(label.length).toBeLessThanOrEqual(101);
    expect(label.endsWith(" ready for…")).toBe(true);
  });

  test("no caption is no label", () => {
    expect(captionLabel(undefined)).toBe("");
    expect(captionLabel("#only #tags")).toBe("");
  });
});

describe("postLinkLabel", () => {
  test("names the kind of post, then its caption", () => {
    expect(postLinkLabel({ kind: "reel", label: "Knocking in" })).toBe("Reel on Instagram: Knocking in");
    expect(postLinkLabel({ kind: "carousel", label: "" })).toBe("Photos on Instagram");
  });
});
