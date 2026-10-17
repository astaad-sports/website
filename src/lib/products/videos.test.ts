import { describe, expect, test } from "bun:test";

import { isVideoUploadPathname, MAX_VIDEO_BYTES, sniffVideo, storedVideoType, videoProblem } from "./videos";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((value) => (typeof value === "string" ? [...value].map((c) => c.charCodeAt(0)) : [value])));

describe("choosing a video", () => {
  test("an MP4 or a phone's MOV is kept as an MP4, a WebM as a WebM", () => {
    expect(storedVideoType({ name: "clip.mp4", type: "video/mp4" })).toBe("video/mp4");
    expect(storedVideoType({ name: "IMG_0042.MOV", type: "video/quicktime" })).toBe("video/mp4");
    expect(storedVideoType({ name: "clip.webm", type: "video/webm" })).toBe("video/webm");
    // Some systems give no type: the extension decides.
    expect(storedVideoType({ name: "IMG_0042.MOV", type: "" })).toBe("video/mp4");
  });

  test("anything else, an empty file or one past the limit is refused", () => {
    expect(videoProblem({ name: "clip.avi", type: "video/x-msvideo", size: 10 })).toBe("Use an MP4, MOV or WebM video.");
    expect(videoProblem({ name: "photo.jpg", type: "image/jpeg", size: 10 })).not.toBeNull();
    expect(videoProblem({ name: "clip.mp4", type: "video/mp4", size: 0 })).toBe("This video is empty.");
    expect(videoProblem({ name: "clip.mp4", type: "video/mp4", size: MAX_VIDEO_BYTES + 1 })).toContain("too large");
    expect(videoProblem({ name: "clip.mp4", type: "video/mp4", size: MAX_VIDEO_BYTES })).toBeNull();
  });
});

describe("checking an upload", () => {
  test("the file's first bytes say what it is", () => {
    expect(sniffVideo(bytes(0, 0, 0, 0x20, "ftypisom"))).toBe("video/mp4");
    expect(sniffVideo(bytes(0, 0, 0, 0x14, "ftypqt  "))).toBe("video/mp4");
    expect(sniffVideo(bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0))).toBe("video/webm");
    expect(sniffVideo(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0))).toBeNull();
  });

  test("a browser may upload only to a random name in the videos folder", () => {
    expect(isVideoUploadPathname("products/videos/0b8f8d5e-4a1c-4f6e-9d2a-3c5b7e9f1a2b.mp4")).toBe(true);
    expect(isVideoUploadPathname("products/videos/0b8f8d5e-4a1c-4f6e-9d2a-3c5b7e9f1a2b.webm")).toBe(true);
    expect(isVideoUploadPathname("products/0b8f8d5e-4a1c-4f6e-9d2a-3c5b7e9f1a2b.mp4")).toBe(false);
    expect(isVideoUploadPathname("site/home/0b8f8d5e-4a1c-4f6e-9d2a-3c5b7e9f1a2b.mp4")).toBe(false);
    expect(isVideoUploadPathname("products/videos/../site/x.mp4")).toBe(false);
    expect(isVideoUploadPathname("products/videos/clip.html")).toBe(false);
  });
});
