"use client";

import { ScrollTrigger } from "@/lib/gsap";
import { whenLoaderGone } from "@/lib/loaderGate";

/*
 * An entrance that cannot fire before its section is on screen.
 *
 * The problem this solves: a ScrollTrigger measures its start position
 * the moment it is created, which is during hydration — before images
 * have loaded, before fonts have swapped, and before the sections that
 * size themselves in JavaScript have done so. At that point the whole
 * page is bunched near the top, so "top 78%" resolves to a scroll
 * position of roughly zero and the trigger fires immediately.
 *
 * Measured on this page before this existed: every entrance ran at
 * scrollY 0. Trusted Partner played its reveal while it was still
 * 9,009px below the fold, Payment at 14,014px, Contact at 15,148px. By
 * the time a visitor scrolled down, the animation had long finished —
 * which is exactly the "sometimes there is no animation" report.
 *
 * Refreshing later cannot undo that: the callback has already run. So
 * this checks the section's real position at the moment it is asked to
 * reveal, and simply declines if the section is still below the fold.
 * A declined attempt changes nothing, and the trigger stays alive to be
 * asked again — on the next refresh, or when the visitor genuinely
 * arrives.
 *
 * onEnterBack is here too, so arriving from below reveals the section
 * rather than leaving it blank.
 */
/*
 * Resolves once the page has stopped changing shape.
 *
 * Checking "is this section on screen?" is not enough on its own,
 * because during hydration the section genuinely IS near the top — the
 * images above it have no height yet, so the check passes honestly and
 * the entrance still fires far too early. Nothing measurable can tell
 * the two apart at that instant. The only reliable answer is to not
 * answer until the page has settled.
 *
 * Settled means: the load event has fired, the fonts are ready, the
 * document's height has stopped changing for 300ms, AND the splash
 * screen has cleared. Capped at four seconds so a page that never fully
 * settles still gets its entrances.
 *
 * The splash screen is part of it because a section that is on screen
 * at load would otherwise reveal underneath it, and the visitor would
 * scroll to it later to find it already there — the same thing that
 * happens to the hero, one section down.
 */
let hasSettled = false;
const waitingForSettle = [];

function markSettled() {
  if (hasSettled) {
    return;
  }

  /*
   * The last of the four conditions. The other three are already met by
   * the time this is called; this one may not be, so it is waited on
   * rather than tested.
   */
  whenLoaderGone(() => {
    if (hasSettled) {
      return;
    }

    hasSettled = true;

    /*
     * Positions are recomputed BEFORE anything is allowed to reveal, so
     * the first honest evaluation is also an accurate one.
     */
    ScrollTrigger.refresh();

    waitingForSettle.splice(0).forEach((callback) => callback());
  });
}

function whenSettled(callback) {
  if (hasSettled) {
    callback();
    return;
  }

  waitingForSettle.push(callback);
}

if (typeof window !== "undefined") {
  const startSettleWatch = () => {
    let lastHeight = document.documentElement.scrollHeight;
    let quietSince = Date.now();
    const startedAt = Date.now();

    const check = () => {
      const height = document.documentElement.scrollHeight;

      if (height !== lastHeight) {
        lastHeight = height;
        quietSince = Date.now();
      }

      if (Date.now() - quietSince > 300 || Date.now() - startedAt > 4000) {
        window.clearInterval(timer);
        markSettled();
      }
    };

    const timer = window.setInterval(check, 100);
  };

  const afterLoad = () => {
    const fonts = document.fonts && document.fonts.ready;

    if (fonts) {
      fonts.then(startSettleWatch).catch(startSettleWatch);
    } else {
      startSettleWatch();
    }
  };

  if (document.readyState === "complete") {
    afterLoad();
  } else {
    window.addEventListener("load", afterLoad, { once: true });
  }
}

export function revealOnArrival({ trigger, start, onReveal }) {
  if (!trigger || typeof onReveal !== "function") {
    return null;
  }

  let revealed = false;

  const attempt = () => {
    if (revealed) {
      return;
    }

    /*
     * Before the page has settled, every position on it is provisional.
     * Wait, then ask again with the real numbers.
     */
    if (!hasSettled) {
      whenSettled(attempt);
      return;
    }

    /*
     * The one test that matters: is any part of this section at or
     * above the bottom of the screen? If it is entirely below, this is
     * a stale trigger position talking, not a visitor.
     *
     * A section entirely ABOVE the viewport is allowed through — that
     * is someone who has scrolled past quickly, and the right response
     * is to show the content rather than leave it invisible.
     */
    if (trigger.getBoundingClientRect().top >= window.innerHeight) {
      return;
    }

    revealed = true;
    onReveal();
    /*
     * Optional chaining, not a plain call: ScrollTrigger.create() below
     * can invoke onRefresh SYNCHRONOUSLY, as part of its own initial
     * refresh, if the page has already settled and this section is
     * already on screen the moment it is created (both true for any
     * revealOnArrival() call made after the first). When that happens,
     * this line runs while `instance` is still being assigned — a plain
     * `instance.kill()` throws "Cannot access 'instance' before
     * initialization" from inside GSAP's own call stack, an uncaught
     * error that took down the rest of the page's scripts with it, not
     * just this one reveal. Skipping the kill in that one case is
     * harmless: the instance still gets created and torn down normally
     * on unmount either way.
     */
    instance?.kill();
  };

  /*
   * Declared before ScrollTrigger.create() runs, not assigned from its
   * result inline — see the comment on instance?.kill() above for why
   * that ordering is load-bearing, not stylistic.
   */
  let instance;
  instance = ScrollTrigger.create({
    trigger,
    start,
    end: "bottom top",
    onEnter: attempt,
    onEnterBack: attempt,
    onRefresh: attempt,
  });

  return instance;
}
