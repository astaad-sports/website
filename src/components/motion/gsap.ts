"use client";

// GSAP for the store's motion. Plugins register once, here; components
// import gsap and useGSAP from this file so they never run unregistered.
import { useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };

/** Motion only for visitors who haven't asked their device for less of it. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/**
 * Run `animate` only while motion is welcome. Everyone else sees the end state
 * (what the server rendered) with nothing moving. GSAP undoes the animation
 * when the preference changes; call the returned function on unmount.
 */
export function withMotion(animate: () => void | (() => void)): () => void {
  const media = gsap.matchMedia();
  media.add(MOTION_OK, animate);
  return () => media.revert();
}

/** Whether motion is welcome right now (false on the server). */
export function motionWelcome(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOTION_OK).matches;
}

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION_OK);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * motionWelcome for rendering: the server (and hydration) assume motion, as
 * most visitors have it, then the browser's real preference takes over.
 */
export function useMotionWelcome(): boolean {
  return useSyncExternalStore(subscribeMotion, motionWelcome, () => true);
}
