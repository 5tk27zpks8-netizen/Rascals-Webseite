"use client";

import { useEffect } from "react";

/**
 * Keeps the fixed desktop/tablet/mobile website canvas fully visible inside the
 * Website Studio center column. The preview itself keeps its real viewport
 * width (1440/768/390px); only the visual canvas is scaled to the available
 * editor width, so responsive breakpoints and the published rendering stay
 * identical.
 */
export function StudioPreviewFit() {
  useEffect(() => {
    let frame = 0;
    let host: HTMLElement | null = null;
    let stage: HTMLElement | null = null;
    let space: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        host = document.querySelector<HTMLElement>(".studio4-preview-host");
        stage = document.querySelector<HTMLElement>(".studio4-preview-stage");
        space = document.querySelector<HTMLElement>(".studio4-preview-space");
        if (!host || !stage || !space) return;

        const hostStyle = window.getComputedStyle(host);
        const paddingLeft = Number.parseFloat(hostStyle.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(hostStyle.paddingRight) || 0;
        const hostWidth = host.getBoundingClientRect().width;
        const availableWidth = Math.max(1, hostWidth - paddingLeft - paddingRight - 2);

        // offsetWidth is the unscaled website viewport: 1440 / 768 / 390.
        const canvasWidth = Math.max(1, stage.offsetWidth);
        const canvasHeight = Math.max(1, stage.offsetHeight);
        const nextScale = Math.min(1, availableWidth / canvasWidth);

        stage.style.left = `${paddingLeft}px`;
        stage.style.right = "auto";
        stage.style.transformOrigin = "top left";

        const transform = `scale(${nextScale})`;
        if (stage.style.transform !== transform) stage.style.transform = transform;

        const fittedHeight = `${Math.ceil(canvasHeight * nextScale)}px`;
        if (space.style.height !== fittedHeight) space.style.height = fittedHeight;
      });
    };

    const connect = () => {
      host = document.querySelector<HTMLElement>(".studio4-preview-host");
      stage = document.querySelector<HTMLElement>(".studio4-preview-stage");
      space = document.querySelector<HTMLElement>(".studio4-preview-space");
      if (!host || !stage || !space) return false;

      resizeObserver?.disconnect();
      mutationObserver?.disconnect();

      resizeObserver = new ResizeObserver(fit);
      resizeObserver.observe(host);
      resizeObserver.observe(stage);

      mutationObserver = new MutationObserver(fit);
      mutationObserver.observe(stage, { attributes: true, attributeFilter: ["style"] });

      fit();
      return true;
    };

    if (!connect()) {
      const bootObserver = new MutationObserver(() => {
        if (connect()) bootObserver.disconnect();
      });
      bootObserver.observe(document.body, { childList: true, subtree: true });
      window.addEventListener("resize", fit);
      return () => {
        bootObserver.disconnect();
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
        window.removeEventListener("resize", fit);
        cancelAnimationFrame(frame);
      };
    }

    window.addEventListener("resize", fit);
    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
