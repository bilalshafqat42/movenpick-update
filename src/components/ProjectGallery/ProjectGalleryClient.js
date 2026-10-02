"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import { ENTRANCE_EASE } from "@/lib/motion";
import styles from "./ProjectGallery.module.css";

/*
 * Viewport heights of scrolling per slide transition.
 *
 * Above 1 the photos move less per unit of scroll, which is what makes
 * free scrolling through the section feel deliberate rather than
 * skittish. It costs the visitor nothing in effort, because the snap
 * below carries them a whole slide per gesture regardless of how long
 * the runway is.
 */
const SCROLL_VIEWPORTS_PER_TRANSITION = 1.4;

/*
 * How far each photograph drifts inside its own frame as the rail
 * carries it across, as a share of the frame's width.
 *
 * The rail used to move the slides as one solid strip, so every photo
 * travelled at exactly the speed of the gesture and the whole thing read
 * as a filmstrip being dragged. Letting each photo lag its frame a
 * little gives the slides depth: the frame arrives first and the image
 * settles into it.
 *
 * Applied to the photograph inside the slide that is arriving: it
 * starts pushed back within its frame and settles square as the slide
 * finishes covering. That lag is what gives the move depth — without it
 * the incoming slide is a flat card sliding over another flat card.
 *
 * A share of the frame's width, because xPercent is measured against
 * the element's own layout box and a `fill` image's box IS the frame.
 * It must stay under the overhang each side, which is
 * (SLIDE_PARALLAX_SCALE - 1) / 2 — 15% at 1.3. 10% leaves a margin, so
 * a rounding error can never pull an edge into view.
 */
const SLIDE_PARALLAX_PERCENT = 10;

/*
 * How much wider than its frame each photograph is drawn.
 *
 * Done with a transform rather than a width, because next/image writes
 * `width` and `height` inline for a `fill` image and a stylesheet rule
 * lost to it — measured, the photo stayed exactly frame-width and every
 * pixel of drift pulled an empty edge into view. A transform is
 * untouched by those inline styles, and it composes with the drift
 * instead of fighting it.
 */
const SLIDE_PARALLAX_SCALE = 1.3;

/*
 * How much of the scrubber is filled on the first slide.
 *
 * The old sliding thumb was 16% of the track wide, so starting the fill
 * at the same figure keeps both ends of the scrubber looking exactly as
 * they did: a short mark on slide one, a full track on the last.
 */
const TRACK_START_FRACTION = 0.16;

/*
 * Viewport heights the section is held, filling the screen, BEFORE any
 * horizontal travel begins.
 *
 * Without this the rail started moving on the exact scroll pixel the
 * section first covered the viewport — measured, they were the same
 * position — so arriving and changing slide were one indivisible
 * motion. The photo was already sliding before the visitor had seen it
 * whole, which reads as the section getting ahead of them.
 *
 * This buys arrival its own beat: the section locks full-screen and
 * holds on slide one, and only the next push starts the sequence.
 *
 * Deliberately short. Its job is not to be a long pause — it is to
 * guarantee the tail of the gesture that brought the section in cannot
 * leak into the horizontal travel. At 0.35 of a viewport it took three
 * separate pushes to get the first slide to change, which is a beat too
 * many; the snap threshold above does the rest of the work.
 */
const ARRIVAL_VIEWPORTS = 0.15;

/*
 * Share of one transition a gesture must cover before it commits to the
 * next slide. Below this the snap returns to the slide it started from.
 *
 * This is the swipe threshold every touch carousel has. It keeps a
 * stray pixel of scroll, a trackpad tremor, or the tail of the gesture
 * that brought the section in from counting as "next slide".
 */
const COMMIT_THRESHOLD = 0.06;

/*
 * How long the snap takes to carry one slide into place.
 *
 * This is the single biggest lever on how fast the section FEELS. A
 * slide is a full viewport wide, so at the previous 0.25-0.6s the photo
 * crossed the screen at roughly 3,500px/s, which read as a flick rather
 * than a transition. Note that the scrub below adds its own settling
 * time on top of these figures — the two were tuned together against a
 * measured target of a little over a second for the whole move, the
 * pace of a camera push rather than a cut.
 */
const SNAP_DURATION = { min: 0.6, max: 0.9 };

/*
 * Pause after scrolling stops before the snap takes over.
 *
 * At the previous 0.06s it could fire between two wheel events inside a
 * single continuous gesture, so the page appeared to lurch away
 * mid-scroll. This is long enough to be confident the gesture has
 * actually ended and still short enough not to read as hesitation.
 */
const SNAP_DELAY = 0.12;

const CAPTION_IN_DURATION = 0.55;

/*
 * How far from a settled slide the caption starts and finishes fading,
 * measured in slides — 0 is settled, 0.5 is exactly between two.
 *
 * The caption used to fade on a tween fired by the snap starting, which
 * worked when a gesture triggered a snap but not when someone scrolled
 * through by hand: measured, the slide changed while the caption was
 * still 64% visible, so the words swapped in front of the reader.
 *
 * Driving the fade from scroll position instead means the caption is
 * always fully clear at the halfway point — which is exactly where the
 * text swaps — however slowly or quickly the page is scrolled.
 *
 * The hold keeps it at full strength either side of a settled slide, so
 * a small scroll nudge does not dim the text it is sitting on.
 */
const CAPTION_HOLD = 0.14;
const CAPTION_FADED_BY = 0.4;
const CAPTION_RISE = 10;

export default function ProjectGalleryClient({ slides }) {
  /*
   * How many slides actually appear is decided upstream, in
   * shapeProjectGalleryContent (@/content/sections/projectGallery) — it
   * only counts a slide as "added" once an editor has uploaded a real
   * photo for it. The wrapper height, rail width, travel distance and
   * pagination below are all derived from whatever length this array is,
   * so raising or lowering the count in the panel needs no code change.
   */
  const visibleSlides = slides;
  const slideCount = visibleSlides.length;
  const transitionCount = Math.max(1, slideCount - 1);

  const [activeIndex, setActiveIndex] = useState(0);

  const scrollWrapperRef = useRef(null);
  const viewportRef = useRef(null);
  const railRef = useRef(null);
  const trackRef = useRef(null);
  const trackFillRef = useRef(null);
  const captionRef = useRef(null);
  const activeIndexRef = useRef(0);

  /*
   * Track geometry, cached on ScrollTrigger refresh rather than read
   * per frame: measuring offsetWidth mid-scroll forces a synchronous
   * layout, which is exactly the stutter this section is meant not to
   * have.
   */

  const setActive = useCallback((index) => {
    if (index === activeIndexRef.current) {
      return;
    }

    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  /*
   * The scrubber moves every scroll frame, so it is written straight to
   * the DOM rather than held in React state, and it is moved with
   * `x` only. The previous version animated `left`, which is not a
   * compositable property — every frame invalidated layout for the
   * whole pagination row to move a 150px bar.
   */
  /*
   * The scrubber fills from the left rather than sliding along.
   *
   * It used to be a short thumb moved with `x`, which marked where you
   * were but left the track empty on both sides — nothing showed how
   * much of the gallery you had already come through. It now grows, so
   * the travelled part of the path is solid behind you.
   *
   * The leading edge lands in exactly the same place the thumb's right
   * edge used to: the fill starts at the thumb's own width rather than
   * at nothing, so the first slide still reads as "a little way in"
   * instead of an empty track, and the last still fills it completely.
   */
  const positionTrackFill = useCallback((progress) => {
    const trackFill = trackFillRef.current;

    if (!trackFill) {
      return;
    }

    gsap.set(trackFill, {
      scaleX:
        TRACK_START_FRACTION +
        gsap.utils.clamp(0, 1, progress) * (1 - TRACK_START_FRACTION),
    });
  }, []);

  useGSAP(
    () => {
      const wrapper = scrollWrapperRef.current;
      const viewport = viewportRef.current;
      const rail = railRef.current;
      const caption = captionRef.current;

      if (!wrapper || !viewport || !rail || !caption || slideCount <= 1) {
        return undefined;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      /*
       * Reduced motion gets no scroll-driven movement at all. The CSS
       * turns .rail into a plain overflow-x container with x snapping,
       * so the same three slides are still reachable by swipe or by
       * the keyboard — just without the page scroll moving them. The
       * scroll listener below is only there to keep the caption and
       * scrubber honest about which one is showing.
       */
      if (reduceMotion) {
        gsap.set(rail, { clearProps: "transform" });
        gsap.set(caption, { clearProps: "opacity,visibility,y" });
        positionTrackFill(0);

        const handleRailScroll = () => {
          const travel = rail.scrollWidth - rail.clientWidth;
          const progress = travel > 0 ? rail.scrollLeft / travel : 0;

          positionTrackFill(progress);
          setActive(Math.round(progress * transitionCount));
        };

        rail.addEventListener("scroll", handleRailScroll, { passive: true });

        return () => {
          rail.removeEventListener("scroll", handleRailScroll);
        };
      }

      gsap.set(rail, { xPercent: 0 });
      positionTrackFill(0);

      /*
       * Slides stack rather than sitting side by side in a strip.
       *
       * The strip moved every slide at once, so a change read as the
       * whole filmstrip being dragged sideways. Stacked, the slide you
       * are on holds still and the next one travels across and covers
       * it — the same move the gallery makes over the amenities and the
       * photo makes over the gold panel, so the page has one idea of
       * what a transition is rather than three.
       *
       * Set as an attribute rather than in the stylesheet outright,
       * because reduced motion above needs the slides left in flow: it
       * turns .rail into a native horizontal scroller, which absolutely
       * positioned children would break.
       */
      rail.dataset.stacked = "true";

      const slideElements = [...rail.querySelectorAll(`.${styles.slide}`)];
      const slideImages = [...rail.querySelectorAll(`.${styles.image}`)];

      /*
       * Later slides sit above earlier ones, so each new arrival covers
       * what is already there rather than sliding underneath it.
       */
      slideElements.forEach((slide, index) => {
        gsap.set(slide, { zIndex: index });
      });

      /* The overhang the photographs settle within. */
      gsap.set(slideImages, {
        scale: SLIDE_PARALLAX_SCALE,
        transformOrigin: "center center",
      });

      /*
       * Slide n is fully off to the right until the journey reaches
       * n - 1, then travels across as the transition into it plays out,
       * and stays put once it has arrived. Slide 0 never moves: it is
       * the one everything else covers.
       *
       * Its photograph lags the slide it is in, starting pushed back in
       * its frame and settling square as the cover completes. That lag
       * is the parallax — the frame arrives first, the image catches up.
       */
      const applySlideCover = (progress) => {
        const journey = gsap.utils.clamp(0, 1, progress) * transitionCount;

        slideElements.forEach((slide, index) => {
          const covered =
            index === 0 ? 1 : gsap.utils.clamp(0, 1, journey - (index - 1));

          gsap.set(slide, { xPercent: (1 - covered) * 100 });

          const image = slideImages[index];

          if (image) {
            gsap.set(image, {
              xPercent: -(1 - covered) * SLIDE_PARALLAX_PERCENT,
            });
          }
        });
      };

      /*
       * Fades the caption as the rail leaves a slide and back in as it
       * arrives, from the same value that positions the photographs — so
       * the text and the images move on one clock rather than two.
       */
      const applyCaptionFade = (progress) => {
        const journey = gsap.utils.clamp(0, 1, progress) * transitionCount;
        const distance = Math.abs(journey - Math.round(journey));

        const faded = gsap.utils.clamp(
          0,
          1,
          (distance - CAPTION_HOLD) / (CAPTION_FADED_BY - CAPTION_HOLD),
        );

        gsap.set(caption, {
          autoAlpha: 1 - faded,
          y: -CAPTION_RISE * faded,
        });

        /*
         * The slide index changes on the same value, so the swap always
         * lands at the halfway point where the caption is fully clear.
         * Reading it off the raw scroll position instead would let the
         * text change a frame or two before the fade caught up.
         */
        setActive(Math.round(journey));
      };

      applySlideCover(0);
      applyCaptionFade(0);

      const increment = 1 / transitionCount;

      const arrivalDistance = () => viewport.offsetHeight * ARRIVAL_VIEWPORTS;
      const travelDistance = () =>
        viewport.offsetHeight *
        transitionCount *
        SCROLL_VIEWPORTS_PER_TRANSITION;

      /*
       * One gesture, one whole slide — computed from where the section
       * actually IS, not from where GSAP predicts the scroll would
       * coast to.
       *
       * This is the bug that made the section feel violent. GSAP hands
       * a snap function a velocity projection, and with a scrubbed
       * trigger a single wheel flick from the very start of the journey
       * projected 0.79 of the way through it while the real progress
       * was 0.11. Rounding that projection to the nearest slide sent
       * the visitor to the LAST slide, skipping the middle one
       * entirely, from one flick.
       *
       * Quantising the real position instead makes it deterministic:
       * round away from where we are, in the direction of travel, so
       * any gesture commits to exactly the next slide and a long
       * gesture can still carry further. Momentum projection belongs to
       * inertial scrolling, not to a pager.
       */
      const snapToSlide = (naturalValue, self) => {
        const raw = self.progress / increment;
        const forward = self.direction !== -1;

        /*
         * The slide being left behind, then how far past it the gesture
         * actually carried. Taken from the direction of travel rather
         * than from the nearest slide: past the half way point the
         * nearest slide is the one ahead, and rounding to it would send
         * a backward gesture forwards.
         */
        const from = forward ? Math.floor(raw) : Math.ceil(raw);
        const travelled = Math.abs(raw - from);

        const index =
          travelled < COMMIT_THRESHOLD ? from : from + (forward ? 1 : -1);

        return gsap.utils.clamp(0, 1, index * increment);
      };

      /*
       * A proxy, not the rail. The slides are positioned individually
       * now, so there is nothing left to translate as one piece — but
       * the value still has to run through the tween rather than be
       * read off self.progress, because that is what `scrub` smooths.
       * Reading the raw scroll here would drop the smoothing entirely.
       */
      const coverProxy = { value: 0 };

      const drift = gsap.to(coverProxy, {
        value: 1,
        onUpdate: () => {
          applySlideCover(coverProxy.value);
          applyCaptionFade(coverProxy.value);
        },

        /*
         * Linear, with the smoothing left to scrub. An ease here would
         * make the photos speed up and slow down against a steady
         * scroll gesture, which reads as the page fighting the wheel.
         */
        ease: "none",

        scrollTrigger: {
          trigger: wrapper,

          /*
           * Both ends measured off .viewport rather than declared
           * against the wrapper, because .viewport is position: sticky —
           * the wrapper's own height includes the arrival hold, and a
           * short screen where .viewport hits a min-height would put
           * the two out of step.
           *
           * Start is offset by the arrival hold, so progress 0 is the
           * section already filling the screen and settled, not the
           * moment it first touches full coverage.
           */
          start: () => `top top-=${arrivalDistance()}`,
          end: () => `top top-=${arrivalDistance() + travelDistance()}`,

          /*
           * Low deliberately, because it STACKS with the snap. The snap
           * animates the scroll position and the rail follows the scroll
           * through this smoothing, so the photo keeps easing for
           * roughly this long after the snap tween has already
           * finished. At 0.8 the full settle measured just over two
           * seconds, which overshot "cinematic" into "sluggish". The
           * snap owns the pacing; this only takes the edge off a raw
           * wheel gesture.
           */
          scrub: 0.3,
          invalidateOnRefresh: true,

          snap: {
            snapTo: snapToSlide,
            duration: SNAP_DURATION,
            delay: SNAP_DELAY,
            ease: "power2.inOut",

            /*
             * No caption handling here any more.
             *
             * It used to fade out on the snap starting and back in on
             * the snap completing, which left the text at whatever
             * opacity an interrupted snap happened to stop at — and did
             * nothing at all for someone scrolling through by hand.
             * applyCaptionFade above now owns it, from scroll position,
             * so every path through the section gets the same fade.
             */
          },

          /*
           * The scrubber tracks the raw scroll so it answers the gesture
           * immediately. The caption and the slide index deliberately do
           * not — they run off the scrubbed value, with the photographs.
           */
          onUpdate: (self) => {
            positionTrackFill(self.progress);
          },
        },
      });

      return () => {
        drift.scrollTrigger?.kill();
        drift.kill();
        delete rail.dataset.stacked;
      };
    },
    {
      dependencies: [slideCount, transitionCount, positionTrackFill, setActive],
      revertOnUpdate: true,
    },
  );

  /*
   * Reduced motion only: keep the caption visible as the native
   * scroller changes slides.
   *
   * There is deliberately no fade here for everyone else. This used to
   * play a fromTo from autoAlpha 0 on every index change, which is the
   * right idea when the caption is only ever swapped by a completed
   * snap — but it now fights applyCaptionFade, which is already holding
   * the caption at the opacity the scroll position calls for. Two
   * animations writing the same property is how a caption ends up
   * flickering.
   */
  useGSAP(
    () => {
      const caption = captionRef.current;

      if (!caption) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion) {
        gsap.set(caption, { autoAlpha: 1, y: 0 });
      }
    },
    { dependencies: [activeIndex] },
  );

  /*
   * Keep the caption in step if the slide count ever shrinks beneath a
   * stale index (content edit, hot reload).
   */
  useEffect(() => {
    if (activeIndexRef.current > slideCount - 1) {
      setActive(Math.max(0, slideCount - 1));
    }
  }, [slideCount, setActive]);

  const activeSlide = visibleSlides[activeIndex] ?? visibleSlides[0];

  if (!activeSlide) {
    return null;
  }

  return (
    <section
      id="project-gallery"
      className={styles.gallery}
      aria-label="Project gallery"
      role="region"
    >
      <div
        ref={scrollWrapperRef}
        className={styles.scrollWrapper}
        style={{
          "--pg-slides": slideCount,
          "--pg-scroll-viewports":
            1 +
            ARRIVAL_VIEWPORTS +
            (slideCount - 1) * SCROLL_VIEWPORTS_PER_TRANSITION,
        }}
      >
        <div ref={viewportRef} className={styles.viewport}>
          <div ref={railRef} className={styles.rail}>
            {visibleSlides.map((slide, index) => (
              <div key={index} className={styles.slide}>
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  draggable={false}
                  quality={90}
                  sizes="100vw"
                  className={styles.image}
                />
              </div>
            ))}
          </div>

          <div className={styles.overlay} aria-hidden="true" />

          <div className={styles.content}>
            <div ref={captionRef} className={styles.caption}>
              <h2 className={styles.heading}>{activeSlide.heading}</h2>

              <p className={styles.text}>{activeSlide.text}</p>
            </div>

            <div className={styles.pagination}>
              <div ref={trackRef} className={styles.track} aria-hidden="true">
                <div ref={trackFillRef} className={styles.trackFill} />
              </div>

              <span className={styles.counter}>
                {String(activeIndex + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
