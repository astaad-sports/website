"use client";

import { useEffect, useRef } from "react";

import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/instagram/model";

declare global {
  interface Window {
    instgrm?: { Embeds: { process(): void } };
  }
}

const SCRIPT = "https://www.instagram.com/embed.js";

// Instagram's profile embed. embed.js swaps the blockquote for an iframe, so
// React only owns the wrapper and the blockquote goes in as markup. Before the
// script runs, or where a blocker stops it, the link inside is what shows.
const MARKUP = `<blockquote class="instagram-media" data-instgrm-permalink="${INSTAGRAM_URL}?utm_source=ig_embed" data-instgrm-version="14" style="background:#fff;border:1px solid var(--border);border-radius:4px;box-shadow:none;margin:0 auto;max-width:720px;min-width:0;padding:0;width:100%"><a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer" style="display:block;padding:48px 16px;text-align:center;font-weight:600;color:inherit">See @${INSTAGRAM_HANDLE} on Instagram</a></blockquote>`;

/** Loads embed.js once; if it is already here, asks it to draw new embeds. */
function drawEmbeds() {
  if (window.instgrm) {
    window.instgrm.Embeds.process();
    return;
  }
  // Still loading: it draws every embed on the page when it arrives.
  if (document.querySelector(`script[src="${SCRIPT}"]`)) return;
  const script = document.createElement("script");
  script.src = SCRIPT;
  script.async = true;
  document.body.appendChild(script);
}

/**
 * The profile card and latest posts, drawn by Instagram. Shown while the
 * store's own feed isn't set up (see src/lib/instagram/feed.ts). Instagram's
 * script loads only as the section nears the screen.
 */
export function InstagramEmbed() {
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        drawEmbeds();
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // embed.js gives its iframe a left-aligned margin; the flex row centres it.
  return <div ref={wrapper} className="flex w-full justify-center" dangerouslySetInnerHTML={{ __html: MARKUP }} />;
}
