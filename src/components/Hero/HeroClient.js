"use client";

import Image from "next/image";
import SafeImage from "@/components/SafeImage";
import { useCallback, useRef } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { whenLoaderGone } from "@/lib/loaderGate";
import {
  ENTRANCE_DURATION,
  ENTRANCE_EASE,
  HERO_COPY_STAGGER,
  INTRO_BREAKPOINT,
  INTRO_COPY_START,
  INTRO_SCENE_START,
} from "@/lib/motion";
import styles from "./Hero.module.css";

/*
 * The framed photo grows from its framed size to the full width and
 * height of its panel as that panel arrives on screen: it starts as a
 * picture sitting on the pattern and ends as the whole section.
 *
 * width and height, not scale. Scale cannot get from a 904:624 frame to
 * the screen's own proportions without stretching the building, and the
 * photo is the subject — a non-uniform scale would distort it on every
 * frame of the way up. Sizing the box instead lets object-fit: cover
 * reframe the photograph at each step, which is what keeps it
 * undistorted.
 *
 * Desktop only: tablet and mobile have their own frame widths and are
 * short enough that the panel arrives all at once anyway.
 */

/*
 * Where the image panel comes to rest: the scroll position that puts
 * its bottom edge on the viewport's bottom edge, so the whole
 * composition is visible without scrolling past it.
 *
 * Shared by the Scroll Down jump and by the growth's scroll range, so
 * the growth is guaranteed to finish exactly where the jump lands
 * rather than the two being tuned separately and drifting.
 */
function panelRestScrollY(imageSection) {
  /*
   * Measured from the layout tree, not from getBoundingClientRect.
   *
   * The panel is sticky on desktop so that the section after it can
   * ride over it, and a stuck element's rect reports where it is
   * PAINTED, not where it sits in the flow — once stuck it returns a
   * top of 0 forever, which made this figure track the scroll position
   * instead of staying the constant it is meant to be. offsetTop is
   * layout-based and ignores sticky offsets entirely.
   *
   * Four things read this: the Scroll Down jump, the end of the photo's
   * growth, where the pattern is pinned, and when the pattern is
   * switched off. All four have to agree, so there is one definition.
   */
  let top = 0;
  let node = imageSection;

  while (node) {
    top += node.offsetTop;
    node = node.offsetParent;
  }

  return Math.max(0, top + imageSection.offsetHeight - window.innerHeight);
}

export default function HeroClient({
  mainImage,
  mainImageFallback,
  mainImageAlt,
  eyebrow,
  heading,
  text,
  ctaLabel,
  ctaHref,
}) {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const imageSectionRef = useRef(null);
  const patternRef = useRef(null);
  const imageFrameRef = useRef(null);

  /*
   * Clicking Scroll Down reveals the full-height pattern + building photo
   * panel below the text, rather than jumping straight into the About
   * section after it. The target aligns the bottom of that panel with the
   * bottom of the viewport, so the whole composition becomes visible
   * without scrolling past it.
   *
   * Driven by GSAP's ScrollToPlugin rather than the native
   * scrollIntoView(): the browser's own smooth scroll uses a fixed, fairly
   * quick easing that isn't adjustable, whereas this gives the motion the
   * same longer, gentler ease used for the header's own scroll-to-section
   * jumps.
   */
  const revealImage = useCallback((event) => {
    event.preventDefault();

    const section = sectionRef.current;
    const imageSection = imageSectionRef.current;

    if (!section || !imageSection) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /*
     * On mobile the hero is already one screen with the photo panel
     * in it, so there is nothing left inside the section to reveal —
     * Scroll Down moves on to the next section instead. Read from the
     * DOM rather than by id so it follows the page order rather than
     * needing to know what comes next.
     */
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const nextSection = section.nextElementSibling;

    let targetY = panelRestScrollY(imageSection);

    if (mobile && nextSection) {
      /*
       * Land on the position the next section's snap point will settle
       * at, not merely at its top.
       *
       * That offset is the page's scroll-padding PLUS the section's own
       * scroll-margin, and on mobile those cancel out (see globals.css:
       * 90px of padding against -90px of margin, so a full-screen
       * section rests flush). Subtracting only the padding left the
       * tween 90px short, and restoring snapping afterwards yanked the
       * page that 90px in a single frame — the abrupt jolt at the end.
       */
      const rootStyle = window.getComputedStyle(document.documentElement);
      const nextStyle = window.getComputedStyle(nextSection);

      const snapOffset =
        (parseFloat(rootStyle.scrollPaddingTop) || 0) +
        (parseFloat(nextStyle.scrollMarginTop) || 0);

      targetY = Math.max(
        0,
        nextSection.getBoundingClientRect().top + window.scrollY - snapOffset,
      );
    }

    /*
     * CSS scroll snapping is suspended for the duration.
     *
     * The browser re-snaps after every frame a scripted scroll writes,
     * so the tween and the snap end up taking turns dragging the page —
     * the same fight that made this button stutter badly enough to be
     * reported as broken once before. Restored on completion and on
     * interrupt, so a tween that never finishes cannot leave the page
     * without snapping.
     */
    const root = document.documentElement;
    const restoreSnap = () => {
      root.style.removeProperty("scroll-snap-type");
    };

    root.style.scrollSnapType = "none";

    gsap.to(window, {
      scrollTo: { y: targetY, autoKill: false },
      duration: reduceMotion ? 0 : 1.4,
      ease: "power2.inOut",
      overwrite: true,
      onComplete: restoreSnap,
      onInterrupt: restoreSnap,
    });
  }, []);

  useGSAP(
    (context, contextSafe) => {
      const section = sectionRef.current;
      const content = contentRef.current;
      const scrollIndicator = scrollIndicatorRef.current;
      const patternEl = patternRef.current;
      const patternImageEl = patternEl?.querySelector("img") ?? patternEl;
      const imageFrameEl = imageFrameRef.current;

      if (!section || !content) {
        return;
      }

      const eyebrowEl = content.querySelector(`.${styles.eyebrow}`);
      const titleEl = content.querySelector(`.${styles.title}`);
      const subtitleEl = content.querySelector(`.${styles.subtitle}`);
      /*
       * Optional: the button only renders when both a label and a link
       * are set, so everything below has to cope with it being absent.
       */
      const ctaButtonEl = content.querySelector(`.${styles.ctaButton}`);

      if (!eyebrowEl || !titleEl || !subtitleEl) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion) {
        gsap.set(
          [
            eyebrowEl,
            titleEl,
            subtitleEl,
            ctaButtonEl,
            scrollIndicator,
            imageFrameEl,
            patternEl,
          ].filter(Boolean),
          { autoAlpha: 1, y: 0 },
        );

        return;
      }

      /*
       * The whole opening waits for the splash screen to clear (see
       * lib/loaderGate). Without it the sequence below played out under
       * a full-screen overlay, and a first-time visitor's first sight
       * of the page was its finished state.
       *
       * contextSafe, because these are created after useGSAP's callback
       * has already returned. Anything built outside the context is not
       * tracked by it, and would survive an unmount or a hot reload
       * instead of being reverted with everything else.
       */
      const playIntro = contextSafe(() => {
        /*
         * The stylesheet's fallback has already revealed the copy (see
         * the intro block in Hero.module.css), so this script is very
         * late. Animating from hidden now would take a page the visitor
         * is already reading and hide it again to introduce it.
         */
        if (Number(window.getComputedStyle(titleEl).opacity) > 0.5) {
          gsap.set(
            [
              eyebrowEl,
              titleEl,
              subtitleEl,
              ctaButtonEl,
              scrollIndicator,
              imageFrameEl,
              patternImageEl,
            ].filter(Boolean),
            { autoAlpha: 1, y: 0 },
          );

          return;
        }

        /*
         * Desktop opens in three deliberate beats instead of one cascade:
         * the copy, then the header's controls (Header runs that one — see
         * introStepStart in lib/motion), then the pattern and the
         * building photo. Each group waits for the previous one to land
         * and then holds for a beat, so the page introduces itself in the
         * order it wants to be read.
         *
         * Within the first beat the five lines arrive one at a time —
         * eyebrow, heading, description, Discover More, Scroll Down —
         * rather than as one block. They used to move together, which is
         * why the button in particular looked like it had no entrance of
         * its own.
         */
        if (window.matchMedia(INTRO_BREAKPOINT).matches) {
          gsap.fromTo(
            [
              eyebrowEl,
              titleEl,
              subtitleEl,
              ctaButtonEl,
              scrollIndicator,
            ].filter(Boolean),
            { autoAlpha: 0, y: 32 },
            {
              autoAlpha: 1,
              y: 0,
              duration: ENTRANCE_DURATION,
              stagger: HERO_COPY_STAGGER,
              ease: ENTRANCE_EASE,
              delay: INTRO_COPY_START,
            },
          );

          /*
           * The pattern first, then the building photo one step after it,
           * continuing the same rhythm the copy and the header just set.
           *
           * Both rise into place the same way.
           *
           * The rise is applied to the IMAGE inside the pattern's
           * wrapper, never to the wrapper itself. The wrapper is what is
           * pinned to the viewport (see .patternPin in the module CSS),
           * and it also carries the visibility that switches the pattern
           * off once the hero is past — moving it here would unpin it,
           * and writing to it would fight that trigger. The image can
           * travel freely inside it, which gives the same entrance with
           * neither side effect.
           */
          gsap.fromTo(
            patternImageEl,
            { autoAlpha: 0, y: 40 },
            {
              autoAlpha: 1,
              y: 0,
              duration: ENTRANCE_DURATION,
              ease: ENTRANCE_EASE,
              delay: INTRO_SCENE_START,
            },
          );

          gsap.fromTo(
            imageFrameEl,
            { autoAlpha: 0, y: 40 },
            {
              autoAlpha: 1,
              y: 0,
              duration: ENTRANCE_DURATION,
              ease: ENTRANCE_EASE,
              delay: INTRO_SCENE_START + HERO_COPY_STAGGER,
            },
          );

          return;
        }

        /*
         * Below 1025px, one cascade rather than the desktop's three beats,
         * which depend on the copy and the photo occupying separate
         * screens — they do not here.
         *
         * Same order and the same widened gap as desktop, and the button
         * is part of it: it used to be left out of this list entirely, so
         * on a phone it simply sat there from the first frame while
         * everything around it arrived.
         */
        const step = HERO_COPY_STAGGER;

        const mobileTimeline = gsap.timeline({
          defaults: { ease: ENTRANCE_EASE, duration: ENTRANCE_DURATION },
        });

        mobileTimeline
          .fromTo(eyebrowEl, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0 }, 0)
          .fromTo(
            titleEl,
            { autoAlpha: 0, y: 32 },
            { autoAlpha: 1, y: 0 },
            step,
          )
          .fromTo(
            subtitleEl,
            { autoAlpha: 0, y: 20 },
            { autoAlpha: 1, y: 0 },
            step * 2,
          );

        if (ctaButtonEl) {
          mobileTimeline.fromTo(
            ctaButtonEl,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0 },
            step * 3,
          );
        }

        mobileTimeline
          .fromTo(
            scrollIndicator,
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0 },
            step * 4,
          )
          /*
           * The pattern and the photo wait for the header, exactly as
           * they do on desktop, so the opening is one chain at every
           * size rather than two that overlap on a phone. Positioned at
           * the shared absolute times rather than at multiples of `step`,
           * because the header sits between them and the copy.
           *
           * The IMAGE inside the wrapper, not the wrapper — the same
           * element desktop animates and the same one the stylesheet
           * starts hidden. This animated the wrapper for a while, which
           * left the image at opacity 0 for ever: the wrapper faded in
           * over an image nothing had revealed, so the pattern never
           * appeared on a phone at all.
           */
          .fromTo(
            patternImageEl,
            { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0 },
            INTRO_SCENE_START,
          )
          .fromTo(
            imageFrameEl,
            { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0 },
            INTRO_SCENE_START + step,
          );
      });

      return whenLoaderGone(playIntro);
    },
    { scope: sectionRef },
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      const imageSection = imageSectionRef.current;
      const imageFrameEl = imageFrameRef.current;
      const patternEl = patternRef.current;

      if (!section || !imageSection || !imageFrameEl) {
        return undefined;
      }

      const matchMedia = gsap.matchMedia();

      matchMedia.add(
        {
          desktop: "(min-width: 1025px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { desktop = false, reduceMotion = false } =
            context.conditions ?? {};

          /*
           * Below 1025px the frame has its own width (see
           * Hero.module.css), and reduced motion gets the framed size
           * with no growth at all.
           */
          if (!desktop || reduceMotion) {
            gsap.set(imageFrameEl, { clearProps: "width,height" });
            section.style.removeProperty("--hero-pattern-top");

            return undefined;
          }

          /*
           * The framed size is read from the CSS rather than restated
           * here, so the two cannot drift: the inline width and height
           * this tween writes are cleared first, which drops the
           * element back to the rule in Hero.module.css, and then it is
           * measured.
           *
           * Re-run on every refresh, before ScrollTrigger evaluates the
           * function-based values below, so a resized window is
           * measured again instead of animating from a size that
           * belonged to the old viewport.
           */
          /*
           * Where the pinned pattern sits: the panel's top edge when
           * the page is at a scroll position of zero, which is the same
           * distance the panel travels before coming to rest. Published
           * as a custom property for the CSS to read, and re-measured on
           * every refresh so a resized window repins it rather than
           * leaving it at the old viewport's figure.
           */
          const syncPatternTop = () => {
            section.style.setProperty(
              "--hero-pattern-top",
              `${Math.round(panelRestScrollY(imageSection))}px`,
            );
          };

          syncPatternTop();

          /*
           * A pinned element outlives its section unless something
           * switches it off. Fixed positioning takes the pattern out of
           * the flow entirely, so once the hero had scrolled past it
           * carried on painting over whatever came next — it sat on top
           * of the project overview's key facts.
           *
           * Switched off the moment the photograph finishes filling
           * the panel, not when the hero eventually ends. At that point
           * the photo covers the whole viewport, so the pattern behind
           * it has nothing left to contribute and turning it off is
           * invisible — whereas leaving it on until the hero's bottom
           * edge cleared the screen meant it was still painting over
           * the project overview's key facts and buttons.
           *
           * The end is panelRestScrollY, the same figure the growth,
           * the parallax and the Scroll Down button all use, so
           * "pattern off" and "photo full" are the same moment by
           * construction rather than by two numbers that happen to
           * agree.
           *
           * The visibility is written straight to the element rather
           * than through GSAP: the pattern's fade-in is a GSAP
           * autoAlpha tween on the image inside this wrapper, and two
           * things writing visibility to the same element would take
           * turns winning.
           */
          const patternVisibility = patternEl
            ? ScrollTrigger.create({
                trigger: section,
                start: 0,
                end: () => Math.max(1, panelRestScrollY(imageSection)),
                invalidateOnRefresh: true,

                /*
                 * Fades out and back in, rather than switching off once
                 * and staying off. onLeave and onEnterBack are a pair:
                 * scrolling down past the point where the photo fills
                 * the panel takes the pattern away, scrolling back up
                 * brings it back.
                 *
                 * overwrite: "auto" so a quick change of direction
                 * cancels the tween in flight instead of queueing a
                 * second one behind it — otherwise a fast scroll up and
                 * down leaves the pattern settling on the wrong state.
                 */
                onLeave: () => {
                  gsap.to(patternEl, {
                    autoAlpha: 0,
                    duration: 0.45,
                    ease: "power2.out",
                    overwrite: "auto",
                  });
                },

                onEnterBack: () => {
                  gsap.to(patternEl, {
                    autoAlpha: 1,
                    duration: 0.45,
                    ease: "power2.out",
                    overwrite: "auto",
                  });
                },
              })
            : null;

          const restingSize = { width: 0, height: 0 };

          const measureRestingSize = () => {
            syncPatternTop();

            gsap.set(imageFrameEl, { clearProps: "width,height" });

            restingSize.width = imageFrameEl.offsetWidth;
            restingSize.height = imageFrameEl.offsetHeight;
          };

          measureRestingSize();

          const growth = gsap.fromTo(
            imageFrameEl,
            {
              width: () => restingSize.width,
              height: () => restingSize.height,
            },
            {
              /*
               * The panel's own box, so the photo finishes as the
               * section rather than at a number that happens to match
               * it today.
               */
              width: () => imageSection.clientWidth,
              height: () => imageSection.clientHeight,

              /*
               * Linear, with the smoothing left to scrub. An ease here
               * would make the frame speed up and slow down against a
               * steady scroll, which reads as the page fighting the
               * wheel rather than following it.
               */
              ease: "none",

              scrollTrigger: {
                trigger: section,

                /*
                 * Ranged over exactly the Scroll Down journey: framed
                 * at the page's own resting position, filling the panel
                 * at the point where the panel's bottom edge meets the
                 * viewport's.
                 *
                 * Anchored to the hero section rather than the panel
                 * because the panel already peeks into view at page
                 * load. Triggering on the panel's own top edge crossing
                 * the viewport bottom would put progress at about a
                 * third before the visitor had touched anything, so the
                 * sliver they first see would already be part-grown.
                 */
                start: "top top",
                end: () => `+=${Math.max(1, panelRestScrollY(imageSection))}`,

                onRefreshInit: measureRestingSize,

                /*
                 * A little weight, so the frame glides to the scroll
                 * position rather than being nailed to it frame by
                 * frame.
                 */
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            },
          );

          return () => {
            growth.scrollTrigger?.kill();
            growth.kill();

            patternVisibility?.kill();

            if (patternEl) {
              gsap.killTweensOf(patternEl);
              gsap.set(patternEl, { clearProps: "opacity,visibility" });
            }

            section.style.removeProperty("--hero-pattern-top");
          };
        },
      );

      return () => {
        matchMedia.revert();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="home"
      className={styles.hero}
      aria-labelledby="hero-title"
    >
      {/*
       * The copy and the scroll cue travel together, so they share a
       * panel. On desktop that panel is the layer the photo slides up
       * over; below 1025px it is `display: contents`, so the box is not
       * there at all and the two sit in the hero's own flex column
       * exactly as before.
       */}
      <div className={styles.textPanel}>
        <div ref={contentRef} className={styles.content}>
          <p className={styles.eyebrow}>{eyebrow}</p>

          <h1 id="hero-title" className={styles.title}>
            {heading}
          </h1>

          <p className={styles.subtitle}>{text}</p>

          {ctaLabel && ctaHref ? (
            <a
              href={ctaHref}
              className={styles.ctaButton}
              {...(ctaHref === "#contact"
                ? { "data-contact-popup": true }
                : {})}
            >
              <span>{ctaLabel}</span>
              <span className={styles.ctaIcon} aria-hidden="true">
                →
              </span>
            </a>
          ) : null}
        </div>

        <a
          ref={scrollIndicatorRef}
          href="#hero-image"
          className={styles.scrollIndicator}
          aria-label="Scroll down to discover Movenpick"
          onClick={revealImage}
        >
          <span className={styles.scrollLine} aria-hidden="true" />
          <span className={styles.scrollText}>Scroll Down</span>
        </a>
      </div>

      {/*
       * The panel needs a wrapper to be sticky inside.
       *
       * A sticky element is confined by its own MARGIN box, so putting
       * the runway on the panel's margin-bottom left it no room to
       * shift and it never stuck at all. The runway belongs to a
       * separate box. Below 1025px this wrapper is `display: contents`
       * and is not in the layout at all.
       */}
      <div className={styles.imageScroll}>
        <div
          ref={imageSectionRef}
          id="hero-image"
          className={styles.imageSection}
        >
          {/*
           * The pattern needs a wrapper of its own.
           *
           * next/image with `fill` writes position: absolute as an INLINE
           * style, and inline beats any stylesheet rule — so the pinning
           * could never be applied to the image itself. The wrapper is
           * what gets pinned; the image just fills whatever box it is
           * given.
           */}
          <div ref={patternRef} className={styles.patternPin}>
            <Image
              src="/images/hero/pattern.avif"
              alt=""
              aria-hidden="true"
              fill
              quality={80}
              sizes="100vw"
              priority
              className={styles.patternShape}
            />
          </div>

          <div ref={imageFrameRef} className={styles.imageFrame}>
            <SafeImage
              src={mainImage}
              fallbackSrc={mainImageFallback}
              alt={mainImageAlt}
              fill
              quality={85}
              sizes="(max-width: 767px) 88vw, (max-width: 1024px) 74vw, 100vw"
              priority
              className={styles.image}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
