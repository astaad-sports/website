"use client";

import { useEffect, useState } from "react";

import { shrinkImage } from "@/lib/products/shrink-image";

export { PHOTO_ACCEPT } from "@/lib/products/shrink-image";

export interface ChosenPhoto {
  /** The shrunk file, to send with the form. */
  file: File;
  /** An object URL for the preview. */
  url: string;
}

/**
 * The photo a review form will send: chosen, shrunk in the browser (which
 * also drops where it was taken), previewed, or cleared. The form adds
 * `photo.file` to what it posts. `error` explains a file that can't be used.
 */
export function useReviewPhoto() {
  const [photo, setPhoto] = useState<ChosenPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  // Let the browser free the preview once it is replaced or the form goes.
  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo.url);
  }, [photo]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setPreparing(true);
    setError(null);
    const result = await shrinkImage(file);
    setPreparing(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPhoto({ file: result.file, url: URL.createObjectURL(result.file) });
  }

  function clear() {
    setPhoto(null);
    setError(null);
  }

  return { photo, error, preparing, choose, clear };
}
