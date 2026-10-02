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
  const transitionCount = Math.max(1, slideCount - 1);

  /*
   * activeIndex is what the caption and counter show, and changes at the
   * halfway point of a move. targetIndex is where the arrows are taking
   * the gallery, and changes on the click, so the buttons' disabled
   * state answers immediately.
   */
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);

  const railRef = useRef(null);
  const trackFillRef = useRef(null);
  const captionRef = useRef(null);
  const activeIndexRef = useRef(0);

  /*
   * The slide position as a 0–1 value across the whole gallery, and the
   * function that renders it. Held in refs so the arrow handlers can
   * tween it without re-running the setup.
   */
  const coverProxyRef = useRef({ value: 0 });
  const renderRef = useRef(null);
  const tweenRef = useRef(null);

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
       * Later slides sit above earlier ones, so each new arrival covers
       * what is already there rather than sliding underneath it.
       *
       * x: 0 because the stylesheet parks every slide after the first
       * off to the right until this runs. GSAP reads that translateX
       * back as a pixel x, and left in place it would stack on top of
       * the xPercent below and hold the slides off screen for good.
       */
      slideElements.forEach((slide, index) => {
        gsap.set(slide, { x: 0, zIndex: index });
      });

      /* The overhang the photographs settle within. */
      gsap.set(slideImages, {
        scale: SLIDE_PARALLAX_SCALE,
        transformOrigin: "center center",
      });

      /*
       * Slide n is fully off to the right until the gallery reaches
       * n - 1, then travels across as the move into it plays out, and
       * stays put once it has arrived. Slide 0 never moves: it is the
       * one everything else covers.
       */
      const render = (progress) => {
        const clamped = gsap.utils.clamp(0, 1, progress);
        const journey = clamped * transitionCount;

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

        gsap.set(trackFill, {
          scaleX: TRACK_START_FRACTION + clamped * (1 - TRACK_START_FRACTION),
        });

        setActive(Math.round(journey));
      };

      renderRef.current = render;
      render(coverProxyRef.current.value);

      return () => {
        tweenRef.current?.kill();
        tweenRef.current = null;
        renderRef.current = null;
      };
    },
    {
      dependencies: [slideCount, transitionCount, setActive],
      revertOnUpdate: true,
    },
  );

  const goTo = useCallback(
    (index, { duration = SLIDE_DURATION, ease = SLIDE_EASE } = {}) => {
      const next = gsap.utils.clamp(0, slideCount - 1, index);
      const render = renderRef.current;
      const proxy = coverProxyRef.current;

      setTargetIndex(next);

      if (!render) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      tweenRef.current?.kill();

      const value = next / transitionCount;

      if (reduceMotion) {
        proxy.value = value;
        render(value);
        return;
      }

      tweenRef.current = gsap.to(proxy, {
        value,
        duration,
        ease,
        onUpdate: () => render(proxy.value),
      });
    },
    [slideCount, transitionCount],
  );

  /*
   * Drag to change slide, with a mouse or a finger. The photos follow
   * the pointer 1:1 — a full gallery width of drag is one whole slide —
   * and on release the gallery settles on whichever slide the drag
   * committed to.
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

      tweenRef.current?.kill();

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startTime: performance.now(),
        startValue: coverProxyRef.current.value,
        fromIndex: Math.round(coverProxyRef.current.value * transitionCount),
        width: event.currentTarget.offsetWidth || window.innerWidth,
        moved: false,
      };
    },
    [slideCount, transitionCount],
  );

  const handlePointerMove = useCallback(
    (event) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - drag.startX;

      if (!drag.moved) {
        if (Math.abs(dx) < DRAG_START_PX) {
          return;
        }

        drag.moved = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setIsDragging(true);
      }

      const proxy = coverProxyRef.current;

      proxy.value = gsap.utils.clamp(
        0,
        1,
        drag.startValue - dx / drag.width / transitionCount,
      );

      renderRef.current?.(proxy.value);
    },
    [transitionCount],
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

      /* Dragging left moves forward, as on any touch carousel. */
      const step = committed ? (dx < 0 ? 1 : -1) : 0;

      goTo(drag.fromIndex + step, {
        duration: DRAG_SETTLE_DURATION,
        ease: "power3.out",
      });
    },
    [goTo],
  );

  /*
   * Keep the caption in step if the slide count ever shrinks beneath a
   * stale index (content edit, hot reload).
   */
  useEffect(() => {
    if (activeIndexRef.current > slideCount - 1) {
      goTo(slideCount - 1);
    }
  }, [slideCount, goTo]);

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

          {hasMultiple && (
            <>
              <NavArrow
                direction="prev"
                className={styles.navPrev}
                disabled={targetIndex === 0}
                onClick={() => goTo(targetIndex - 1)}
              />

              <NavArrow
                direction="next"
                className={styles.navNext}
                disabled={targetIndex === slideCount - 1}
                onClick={() => goTo(targetIndex + 1)}
              />
            </>
          )}

          <div className={styles.content}>
            <div ref={captionRef} className={styles.caption} aria-live="polite">
              <h2 className={styles.heading}>{activeSlide.heading}</h2>

              <p className={styles.text}>{activeSlide.text}</p>
            </div>

            <div className={styles.pagination}>
              <div className={styles.track} aria-hidden="true">
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
