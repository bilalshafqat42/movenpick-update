"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import NavArrow from "@/components/NavArrow/NavArrow";
import styles from "./ProjectGallery.module.css";

/*
 * How far each photograph drifts inside its own frame as its slide
 * travels across, as a share of the frame's width.
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
 * How much of the scrubber is filled on the first slide: a short mark
 * on slide one, a full track on the last.
 */
const TRACK_START_FRACTION = 0.16;

/*
 * How long one slide takes to travel across when an arrow is pressed.
 * The pace of a camera push rather than a cut.
 */
const SLIDE_DURATION = 1.1;
const SLIDE_EASE = "power3.inOut";

/*
 * Dragging. A release commits to the neighbouring slide once the drag
 * has covered this share of the gallery's width, or sooner if it was a
 * quick flick (pixels per millisecond). Anything less springs back.
 * Below DRAG_START_PX the pointer is treated as not having moved, so a
 * click on the photo stays a click.
 */
const DRAG_COMMIT_FRACTION = 0.15;
const DRAG_FLICK_VELOCITY = 0.5;
const DRAG_START_PX = 6;
const DRAG_SETTLE_DURATION = 0.6;

/*
 * How far from a settled slide the caption starts and finishes fading,
 * measured in slides — 0 is settled, 0.5 is exactly between two. The
 * caption is always fully clear at the halfway point, which is exactly
 * where the text swaps.
 */
const CAPTION_HOLD = 0.14;
const CAPTION_FADED_BY = 0.4;
const CAPTION_RISE = 10;

export default function ProjectGalleryClient({ slides }) {
  /*
   * How many slides actually appear is decided upstream, in
   * shapeProjectGalleryContent (@/content/sections/projectGallery) — it
   * only counts a slide as "added" once an editor has uploaded a real
   * photo for it. Everything below is derived from this array's length,
   * so raising or lowering the count in the panel needs no code change.
   */
  const visibleSlides = slides;
  const slideCount = visibleSlides.length;

  /* The caption and counter, which change at the halfway point of a move. */
  const [activeIndex, setActiveIndex] = useState(0);

  const railRef = useRef(null);
  const trackFillRef = useRef(null);
  const captionRef = useRef(null);
  const activeIndexRef = useRef(0);

  /*
   * The gallery loops, so there is no single 0–1 position across it any
   * more. Instead it is always either settled on `currentRef`, or part
   * way through ONE move: from one slide to its neighbour (`to`), in a
   * direction (`dir`, 1 forward / -1 back), `t` of the way through.
   * Arrows and drag both drive that one move, through `renderRef`.
   */
  const currentRef = useRef(0);
  const moveRef = useRef({ from: 0, to: 0, dir: 1, t: 0 });
  const renderRef = useRef(null);
  const tweenRef = useRef(null);
  const tweenTargetRef = useRef(null);

  const wrap = useCallback(
    (index) => ((index % slideCount) + slideCount) % slideCount,
    [slideCount],
  );

  const setActive = useCallback((index) => {
    if (index === activeIndexRef.current) {
      return;
    }

    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  useGSAP(
    () => {
      const rail = railRef.current;
      const caption = captionRef.current;
      const trackFill = trackFillRef.current;

      if (!rail || !caption || !trackFill) {
        return undefined;
      }

      const slideElements = [...rail.querySelectorAll(`.${styles.slide}`)];
      const slideImages = [...rail.querySelectorAll(`.${styles.image}`)];

      /*
       * x: 0 because the stylesheet parks every slide after the first
       * off to the right until this runs. GSAP reads that translateX
       * back as a pixel x, and left in place it would stack on top of
       * the xPercent below and hold the slides off screen for good.
       */
      gsap.set(slideElements, { x: 0 });

      /* The overhang the photographs settle within. */
      gsap.set(slideImages, {
        scale: SLIDE_PARALLAX_SCALE,
        transformOrigin: "center center",
      });

      /* How full the progress bar is on a given slide. */
      const fillFor = (index) =>
        TRACK_START_FRACTION +
        (slideCount > 1 ? index / (slideCount - 1) : 1) *
          (1 - TRACK_START_FRACTION);

      const place = (index, xPercent, zIndex) => {
        gsap.set(slideElements[index], { xPercent, zIndex });

        if (slideImages[index]) {
          gsap.set(slideImages[index], {
            xPercent: -(xPercent / 100) * SLIDE_PARALLAX_PERCENT,
          });
        }
      };

      /*
       * One move between two neighbouring slides.
       *
       * Forward, the next slide travels in from the right and covers the
       * current one, which holds still. Back, the current slide travels
       * out to the right and uncovers the previous one waiting beneath.
       * Either way the photo lags its frame a little (the parallax), and
       * every other slide waits off to the right, out of sight.
       */
      const render = ({ from, to, dir, t }) => {
        slideElements.forEach((_, index) => {
          if (index !== from && index !== to) {
            place(index, 100, 0);
          }
        });

        if (from === to) {
          place(from, 0, 1);
        } else if (dir > 0) {
          place(from, 0, 1);
          place(to, (1 - t) * 100, 2);
        } else {
          place(to, 0, 1);
          place(from, t * 100, 2);
        }

        const distance = Math.min(t, 1 - t);
        const faded = gsap.utils.clamp(
          0,
          1,
          (distance - CAPTION_HOLD) / (CAPTION_FADED_BY - CAPTION_HOLD),
        );

        gsap.set(caption, {
          autoAlpha: 1 - faded,
          y: -CAPTION_RISE * faded,
        });

        gsap.set(trackFill, {
          scaleX: gsap.utils.interpolate(fillFor(from), fillFor(to), t),
        });

        setActive(t < 0.5 ? from : to);
      };

      renderRef.current = render;

      const current = currentRef.current;

      moveRef.current = { from: current, to: current, dir: 1, t: 0 };
      render(moveRef.current);

      return () => {
        tweenRef.current?.kill();
        tweenRef.current = null;
        renderRef.current = null;
      };
    },
    {
      dependencies: [slideCount, setActive],
      revertOnUpdate: true,
    },
  );

  /*
   * Ends whatever move is under way at once, so a new move or drag
   * always starts from a settled slide. Returns that slide.
   *
   * `towardTarget` lands on wherever the running move was headed rather
   * than on whichever slide is nearer. The arrows use it, so a quick run
   * of clicks advances one slide per click instead of each click
   * snapping back to where the last one started.
   */
  const settleNow = useCallback((towardTarget = false) => {
    const running = tweenRef.current;
    const heading = running ? tweenTargetRef.current : null;

    running?.kill();
    tweenRef.current = null;

    const move = moveRef.current;
    const landed =
      towardTarget && heading !== null
        ? heading === 1
          ? move.to
          : move.from
        : move.t >= 0.5
          ? move.to
          : move.from;

    currentRef.current = landed;
    moveRef.current = { from: landed, to: landed, dir: 1, t: 0 };
    renderRef.current?.(moveRef.current);

    return landed;
  }, []);

  /* Plays a move from `t` to 1 (commit) or 0 (spring back). */
  const playMove = useCallback(
    (target, { duration = SLIDE_DURATION, ease = SLIDE_EASE } = {}) => {
      const render = renderRef.current;
      const move = moveRef.current;

      if (!render) {
        return;
      }

      const finish = () => {
        const landed = target === 1 ? move.to : move.from;

        tweenRef.current = null;
        currentRef.current = landed;
        moveRef.current = { from: landed, to: landed, dir: 1, t: 0 };
        render(moveRef.current);
      };

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion) {
        finish();
        return;
      }

      tweenTargetRef.current = target;
      tweenRef.current = gsap.to(move, {
        t: target,
        duration: duration * Math.max(0.25, Math.abs(target - move.t)),
        ease,
        onUpdate: () => render(move),
        onComplete: finish,
      });
    },
    [],
  );

  /* One slide forward (1) or back (-1), wrapping round at either end. */
  const step = useCallback(
    (dir) => {
      if (slideCount <= 1) {
        return;
      }

      const from = settleNow(true);

      moveRef.current = { from, to: wrap(from + dir), dir, t: 0 };
      playMove(1);
    },
    [slideCount, settleNow, wrap, playMove],
  );

  /*
   * Drag to change slide, with a mouse or a finger. The photos follow
   * the pointer 1:1 — a full gallery width of drag is one whole slide —
   * and on release the move either completes or springs back. Dragging
   * left goes forward, and it wraps round like the arrows.
   *
   * Vertical page scrolling is left to the browser (touch-action: pan-y
   * on .viewport), so a finger swiping up the page still scrolls it.
   */
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback(
    (event) => {
      if (slideCount <= 1 || event.button !== 0) {
        return;
      }

      if (event.target.closest("button")) {
        return;
      }

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startTime: performance.now(),
        width: event.currentTarget.offsetWidth || window.innerWidth,
        moved: false,
      };
    },
    [slideCount],
  );

  const handlePointerMove = useCallback(
    (event) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      /*
       * A mouse pressed here and released somewhere else before the drag
       * threshold was reached never delivers its pointerup to this
       * element (capture only starts once the drag is under way). With
       * no button held, that press is over: drop it, or the next plain
       * hover would start dragging the slides.
       */
      if (event.pointerType === "mouse" && event.buttons === 0) {
        dragRef.current = null;
        return;
      }

      const dx = event.clientX - drag.startX;

      if (!drag.moved) {
        if (Math.abs(dx) < DRAG_START_PX) {
          return;
        }

        drag.moved = true;
        drag.from = settleNow();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setIsDragging(true);
      }

      const fraction = -dx / drag.width;
      const dir = fraction >= 0 ? 1 : -1;

      moveRef.current = {
        from: drag.from,
        to: wrap(drag.from + dir),
        dir,
        t: gsap.utils.clamp(0, 1, Math.abs(fraction)),
      };

      renderRef.current?.(moveRef.current);
    },
    [settleNow, wrap],
  );

  const finishDrag = useCallback(
    (event) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      dragRef.current = null;

      if (!drag.moved) {
        return;
      }

      setIsDragging(false);
      event.currentTarget.releasePointerCapture?.(event.pointerId);

      const dx = event.clientX - drag.startX;
      const elapsed = Math.max(1, performance.now() - drag.startTime);
      const committed =
        Math.abs(dx) > drag.width * DRAG_COMMIT_FRACTION ||
        Math.abs(dx) / elapsed > DRAG_FLICK_VELOCITY;

      playMove(committed ? 1 : 0, {
        duration: DRAG_SETTLE_DURATION,
        ease: "power3.out",
      });
    },
    [playMove],
  );

  /*
   * Keep the caption in step if the slide count ever shrinks beneath a
   * stale index (content edit, hot reload).
   */
  useEffect(() => {
    if (currentRef.current > slideCount - 1) {
      currentRef.current = 0;
      moveRef.current = { from: 0, to: 0, dir: 1, t: 0 };
      renderRef.current?.(moveRef.current);
    }
  }, [slideCount]);

  const activeSlide = visibleSlides[activeIndex] ?? visibleSlides[0];

  if (!activeSlide) {
    return null;
  }

  const hasMultiple = slideCount > 1;

  return (
    <section
      id="project-gallery"
      className={styles.gallery}
      aria-label="Project gallery"
      aria-roledescription="carousel"
      role="region"
    >
      <div className={styles.scrollWrapper}>
        <div
          className={styles.viewport}
          data-draggable={hasMultiple || undefined}
          data-dragging={isDragging || undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div ref={railRef} className={styles.rail}>
            {visibleSlides.map((slide, index) => (
              <div
                key={index}
                className={styles.slide}
                aria-hidden={index !== activeIndex}
              >
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
            <div ref={captionRef} className={styles.caption} aria-live="polite">
              <h2 className={styles.heading}>{activeSlide.heading}</h2>

              <p className={styles.text}>{activeSlide.text}</p>
            </div>

            <div className={styles.pagination}>
              {hasMultiple && (
                <NavArrow
                  variant="line"
                  direction="prev"
                  className={styles.navPrev}
                  onClick={() => step(-1)}
                />
              )}

              <div className={styles.track} aria-hidden="true">
                <div ref={trackFillRef} className={styles.trackFill} />
              </div>

              <span className={styles.counter}>
                {String(activeIndex + 1).padStart(2, "0")}
              </span>

              {hasMultiple && (
                <NavArrow
                  variant="line"
                  direction="next"
                  className={styles.navNext}
                  onClick={() => step(1)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
