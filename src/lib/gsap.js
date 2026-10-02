"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, useGSAP);

/*
 * GSAP's built-in refresh-on-window-load can fire before the page's
 * true layout has settled (hydration, font swap, and similar late
 * shifts can still change section heights right after "load"). When
 * that happens, every ScrollTrigger on the page locks in start/end
 * positions measured against a shorter, stale document height, so
 * sections further down the page trigger their reveals noticeably
 * too early relative to where they actually end up.
 *
 * Watching the document's own height and refreshing shortly after
 * it stops changing keeps every ScrollTrigger on the page accurate,
 * regardless of what caused the late shift.
 */
if (typeof window !== "undefined") {
  let refreshTimeout;

  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimeout);
    refreshTimeout = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);
  };

  /*
   * document.body, not document.documentElement.
   *
   * The root element's own box is the viewport; it does not grow when
   * the content inside it does, so a ResizeObserver watching it never
   * fired for the shifts this is meant to catch. Measured on this page:
   * the document height went 9,547 -> 16,390 -> 17,699 -> 17,759, the
   * last of those 2.8 SECONDS after load, with no refresh in between.
   * body's box does track the content.
   */
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(scheduleRefresh).observe(document.body);
  }

  /*
   * Fonts swapping changes the height of every block of text on the
   * page at once, and it happens after hydration.
   */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleRefresh);
  }

  /*
   * A bounded backstop for anything the two above miss — a late image
   * decode, a section that sizes itself from JavaScript. It watches the
   * document's real height for a few seconds and then stops, so it
   * costs nothing for the rest of the visit.
   */
  let lastHeight = document.documentElement.scrollHeight;
  const startedAt = Date.now();

  const watchHeight = window.setInterval(() => {
    const height = document.documentElement.scrollHeight;

    if (height !== lastHeight) {
      lastHeight = height;
      scheduleRefresh();
    }

    if (Date.now() - startedAt > 8000) {
      window.clearInterval(watchHeight);
    }
  }, 250);
}

export { gsap, ScrollTrigger, useGSAP };
