"use client";

import { useEffect } from "react";

/**
 * Pointer-driven depth for the Hybrid design.
 *
 * Writes two custom properties on each marked element and lets CSS do the
 * transform, so there is no WebGL context, no render loop, and nothing to
 * dispose — the whole effect is a couple of numbers per frame. That is the
 * point of this design: the feeling of depth at a fraction of Arena's cost.
 *
 * Coarse pointers and reduced-motion get nothing at all, which is correct:
 * tilt-on-hover has no meaning on a touchscreen.
 */
export function HybridDepth() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-depth]"));
    if (!targets.length) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const onMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const apply = () => {
      frame = 0;
      for (const target of targets) {
        const strength = Number(target.dataset.depth || 1);
        target.style.setProperty("--tilt-x", `${(-pointerY * 3.2 * strength).toFixed(2)}deg`);
        target.style.setProperty("--tilt-y", `${(pointerX * 4.4 * strength).toFixed(2)}deg`);
        target.style.setProperty("--shift-x", `${(pointerX * 9 * strength).toFixed(1)}px`);
        target.style.setProperty("--shift-y", `${(pointerY * 6 * strength).toFixed(1)}px`);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
