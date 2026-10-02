"use client";

/*
 * Holds the page's opening animations until the splash screen has
 * cleared.
 *
 * The problem this solves: the loader covers the page for about 2.6
 * seconds, and the intro it covers takes about 1. Measured on a fresh
 * session, the header's logo arrived at 340ms, the hero's copy between
 * 600ms and 1050ms, and the building photo at 900ms — all of it behind
 * a full-screen cream overlay that did not lift until 2660ms. A first
 * time visitor never saw the entrance at all; the page simply appeared,
 * finished.
 *
 * Nothing was wrong with the animations themselves, so the fix is not
 * to retime them. They just needed something to wait for.
 *
 * Two rules this has to respect:
 *
 * - It must never be the thing that stops an animation running. Every
 *   path through the loader releases the gate, including the ones that
 *   skip it (a returning visitor this session, reduced motion), and a
 *   six second cap releases it regardless — so a page with no loader
 *   at all, such as the admin panel, still animates normally.
 *
 * - Waiting has to be cancellable, because a component can unmount
 *   before the gate opens. whenLoaderGone returns its own unsubscribe
 *   for that.
 */
let released = false;

const waiting = new Set();

export function releaseLoaderGate() {
  if (released) {
    return;
  }

  released = true;

  const callbacks = [...waiting];
  waiting.clear();

  callbacks.forEach((callback) => callback());
}

export function whenLoaderGone(callback) {
  if (typeof callback !== "function") {
    return () => {};
  }

  if (released) {
    callback();
    return () => {};
  }

  waiting.add(callback);

  return () => {
    waiting.delete(callback);
  };
}

/*
 * The backstop. If the loader never reports in — it is not on this
 * route, it threw, its timeline was killed by a hot reload — the page
 * still gets its entrances rather than staying blank for ever.
 */
if (typeof window !== "undefined") {
  window.setTimeout(releaseLoaderGate, 6000);
}
