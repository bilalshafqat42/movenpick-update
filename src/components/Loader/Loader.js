"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import { releaseLoaderGate } from "@/lib/loaderGate";
import styles from "./Loader.module.css";

const SESSION_KEY = "movenpick-loader-shown";

/*
 * How long the splash may hold the page, in seconds.
 *
 * It leaves as soon as the page is genuinely ready, bounded at both
 * ends, rather than running for a fixed length and hoping that matches.
 * A fixed length cannot: measured on this page, a fast connection has
 * everything ready at 154ms while a Fast 3G connection has not finished
 * the hero photograph until 6.4 seconds. One duration is either a long
 * wait in front of a finished page, or an exit onto an unloaded one.
 *
 * MIN stops it flickering. Anything on screen for less than about half
 * a second reads as a glitch rather than as branding, and on a fast
 * connection "ready" arrives in well under 200ms.
 *
 * MAX is the promise that nobody waits. Past roughly a second an
 * interruption stops feeling immediate and starts feeling like a wait,
 * so the splash gives up at 1.4s and lets the page in even if the
 * photograph is still arriving — it has its own entrance to cover that,
 * and a visible page loading its images beats a cream rectangle.
 *
 * The exit itself adds 0.52s on top, of which the last 0.25s is spent
 * with the page already animating underneath (see releaseLoaderGate
 * below), so worst case the site is in motion by 1.47s and settled by
 * 1.72s. Best case, ~0.77s.
 *
 * All of that assumes the script is running at all. When it is not,
 * the splash lifts itself from CSS — see the note on .overlay in
 * Loader.module.css, which is the case this cannot cover.
 */
const MIN_VISIBLE = 0.5;
const MAX_VISIBLE = 1.2;

/*
 * Ready means the fonts have swapped and the opening screen's images
 * have arrived — the two things that would otherwise change under the
 * visitor after the splash lifts. Everything below the fold can keep
 * loading; nobody is looking at it yet.
 */
function whenPageReady() {
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();

  const hero = document.getElementById("home");

  const images = hero
    ? [...hero.querySelectorAll("img")].filter((image) => !image.complete)
    : [];

  return Promise.all([
    fonts.catch(() => {}),
    ...images.map(
      (image) =>
        new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        }),
    ),
  ]);
}

/*
 * One-time branded splash screen:
 *
 * - Full-screen cream background.
 * - Leaves as soon as the page is ready rather than after a fixed
 *   length of time, held between MIN_VISIBLE and MAX_VISIBLE above.
 * - Logo (rendered as a CSS mask so it takes the brand gold regardless
 *   of whatever colour is baked into the source SVG, see
 *   Loader.module.css) enters from the left while fading in, then
 *   continues travelling right
 *   while fading out, like it's passing through rather than just
 *   appearing and disappearing in place.
 * - Shown once per browser session (sessionStorage), so hard
 *   refreshes later in the same session skip straight past it.
 *
 * Always starts rendered (shouldRender defaults to true) so the
 * server-rendered HTML and the first client render match exactly,
 * no hydration mismatch. Whether it actually plays or skips itself
 * for a returning-this-session visitor is decided inside useGSAP,
 * which runs before the browser paints, so there's no visible
 * flash either way.
 */
export default function Loader({ logoUrl = "/logos/movenpick-logo.svg" }) {
  const pathname = usePathname();
  const isAdminPanel = pathname?.startsWith("/admin-panel") ?? false;

  const overlayRef = useRef(null);
  const logoRef = useRef(null);

  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (!shouldRender || isAdminPanel) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldRender, isAdminPanel]);

  useGSAP(
    (context, contextSafe) => {
      const overlay = overlayRef.current;
      const logo = logoRef.current;

      if (!overlay || !logo || isAdminPanel) {
        return;
      }

      const finish = () => {
        /*
         * Releases the page's opening animations (see lib/loaderGate).
         * Called on every path out of here, the two that skip the splash
         * included, so nothing downstream can be left waiting.
         */
        releaseLoaderGate();

        try {
          window.sessionStorage.setItem(SESSION_KEY, "true");
        } catch {
          // Storage blocked (private browsing, etc). The loader will
          // simply replay next time instead of breaking anything.
        }

        setShouldRender(false);
      };

      let alreadyShown = false;

      try {
        alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "true";
      } catch {
        alreadyShown = false;
      }

      if (alreadyShown) {
        finish();
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion) {
        finish();
        return;
      }

      /*
       * The stylesheet's own fallback has already taken the splash away
       * (Loader.module.css), which means this script arrived very late.
       * Playing the entrance now would run a splash nobody can see and
       * hold the page's opening behind it for another second and a half.
       */
      if (Number(window.getComputedStyle(overlay).opacity) < 0.5) {
        finish();
        return;
      }

      gsap.set(logo, { autoAlpha: 0, x: -48 });

      gsap.to(logo, {
        autoAlpha: 1,
        x: 0,
        duration: 0.5,
        ease: "power2.out",
      });

      const startedAt = performance.now();

      let capTimer;
      let readyTimer;
      let leaving = false;

      const leave = contextSafe(() => {
        if (leaving) {
          return;
        }

        leaving = true;

        window.clearTimeout(capTimer);
        window.clearTimeout(readyTimer);

        gsap
          .timeline({ onComplete: finish })
          .to(logo, {
            autoAlpha: 0,
            x: 48,
            duration: 0.45,
            ease: "power2.in",
          })
          .to(
            overlay,
            {
              autoAlpha: 0,
              duration: 0.45,
              ease: "power2.inOut",
            },
            "-=0.3",
          )
          /*
           * The page starts animating a quarter second before the overlay
           * is fully gone, rather than after it. By then the overlay is
           * faint enough to see straight through, so the site arrives
           * already in motion instead of sitting still for a beat and
           * then starting — which is what waiting for onComplete gives.
           */
          .add(releaseLoaderGate, "-=0.25");
      });

      /*
       * Whichever comes first: the page is ready (never sooner than
       * MIN_VISIBLE), or MAX_VISIBLE is up and we stop waiting for it.
       */
      capTimer = window.setTimeout(leave, MAX_VISIBLE * 1000);

      whenPageReady().then(() => {
        const elapsed = (performance.now() - startedAt) / 1000;

        readyTimer = window.setTimeout(
          leave,
          Math.max(0, MIN_VISIBLE - elapsed) * 1000,
        );
      });

      return () => {
        window.clearTimeout(capTimer);
        window.clearTimeout(readyTimer);
      };
    },
    [isAdminPanel],
  );

  if (!shouldRender || isAdminPanel) {
    return null;
  }

  return (
    <div ref={overlayRef} className={styles.overlay} aria-hidden="true">
      <span
        ref={logoRef}
        className={styles.logoWrapper}
        style={{ "--logo-mask-url": `url("${logoUrl}")` }}
      >
        <span className={styles.logo} />
      </span>
    </div>
  );
}
