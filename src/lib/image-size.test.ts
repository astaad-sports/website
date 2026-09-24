import { describe, expect, test } from "bun:test";

import { imageSize } from "./image-size";

// 37 × 21 pixels each, made with ImageMagick.
const JPEG =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAVACUDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAYI/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AnQCOaRAAAAAAAAAAf//Z";
const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAACUAAAAVAQMAAAD7KrXtAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAADUExURf8AABniCTcAAAAHdElNRQfqCRgPIyaETjrkAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI2LTA5LTI0VDE1OjM1OjM4KzAwOjAw4qjLSwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNi0wOS0yNFQxNTozNTozOCswMDowMJP1c/cAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjYtMDktMjRUMTU6MzU6MzgrMDA6MDDE4FIoAAAADElEQVQI12NgGEgAAAB+AAH9tTdSAAAAAElFTkSuQmCC";
const WEBP_LOSSY = "UklGRk4AAABXRUJQVlA4IEIAAACQAwCdASolABUAPm02l0ikIyIhJWgAgA2JZwDPkoB+AAAr98NwAP7wm0P/5BcsLrka//yA/5Af8gP/498Ql180AAA=";
const WEBP_LOSSLESS = "UklGRhwAAABXRUJQVlA4TA8AAAAvJAAFAAcQ/Y/+ByKi/wEA";
const WEBP_EXTENDED =
  "UklGRq4AAABXRUJQVlA4WAoAAAAQAAAAJAAAFAAAQUxQSBcAAAABDzD/ERGCMNuov/MnPoAJRPR/Aj4UigBWUDggcAAAAFAEAJ0BKiUAFQA+bSySRqQiIaEwFVqogA2JZQDQ+oAyv/cQN5AAWjKY0jAA/vCbQ//kGA/QRkHUeKohRUJnKUFCzH/+QH/8WH/kgoqb/4od/8lJHNl25/xc5eOjY8QtP/WAyn3/yATuP3+QCVlAAAA=";

const bytes = (base64: string) => new Uint8Array(Buffer.from(base64, "base64"));

describe("image size", () => {
  test("reads JPEG, PNG and all three kinds of WebP", () => {
    const size = { width: 37, height: 21 };
    expect(imageSize(bytes(JPEG), "image/jpeg")).toEqual(size);
    expect(imageSize(bytes(PNG), "image/png")).toEqual(size);
    expect(imageSize(bytes(WEBP_LOSSY), "image/webp")).toEqual(size);
    expect(imageSize(bytes(WEBP_LOSSLESS), "image/webp")).toEqual(size);
    expect(imageSize(bytes(WEBP_EXTENDED), "image/webp")).toEqual(size);
  });

  test("a cut-off or foreign header gives null", () => {
    expect(imageSize(bytes(JPEG).subarray(0, 40), "image/jpeg")).toBeNull();
    expect(imageSize(bytes(PNG).subarray(0, 12), "image/png")).toBeNull();
    expect(imageSize(bytes(PNG), "image/webp")).toBeNull();
  });
});
