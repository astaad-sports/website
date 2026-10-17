// A still from a product video, taken in the admin's browser before upload,
// for the store to show until the video plays. Browser-only.

/** The long edge of the still: sharp on the product page without a large file. */
const MAX_EDGE = 1600;
const QUALITY = 0.85;
/** Give up on a video the browser can't open (a codec it lacks) after this long. */
const TIMEOUT_MS = 15_000;

function once(target: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`No ${event}`)), TIMEOUT_MS);
    target.addEventListener(
      event,
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
    target.addEventListener("error", () => reject(new Error("The video could not be opened")), {
      once: true,
    });
  });
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * A frame a second in (or a quarter of the way through a shorter clip),
 * skipping the dark or blurred first frame most clips open with. Null when
 * this browser can't decode the video; the store then shows the first frame.
 */
export async function takeVideoPoster(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const loaded = once(video, "loadeddata");
    video.src = url;
    await loaded;
    const at = Number.isFinite(video.duration) ? Math.min(1, video.duration / 4) : 0;
    if (at > 0) {
      const seeked = once(video, "seeked");
      video.currentTime = at;
      await seeked;
    }
    const { videoWidth: width, videoHeight: height } = video;
    if (!width || !height) return null;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Safari can't encode WebP and quietly gives a PNG; JPEG is smaller then.
    let blob = await encode(canvas, "image/webp");
    if (blob?.type !== "image/webp") blob = await encode(canvas, "image/jpeg");
    if (!blob) return null;
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `poster.${extension}`, { type: blob.type });
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
