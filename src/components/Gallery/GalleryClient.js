"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import { revealOnArrival } from "@/lib/revealOnArrival";
import {
  ENTRANCE_DURATION,
  ENTRANCE_EASE,
  ENTRANCE_STAGGER,
  ENTRANCE_START,
} from "@/lib/motion";
import styles from "./Gallery.module.css";

const DRAG_DISTANCE_THRESHOLD = 64;
const DRAG_VELOCITY_THRESHOLD = 0.45;
const DRAG_RESISTANCE = 0.72;

/*
 * The centre photo's own proportions (900 x 600) and the side cards'
 * (210 x 446), as ratios rather than as the pixel pairs they are
 * derived from, so the geometry below can be driven from either
 * dimension.
 */
const CENTRE_ASPECT = 900 / 600;
const SIDE_ASPECT = 446 / 210;

/*
 * Floor on the centre photo, so an unusually short window shrinks the
 * composition rather than collapsing it to a letterbox.
 */
const MIN_CENTRE_HEIGHT = 300;

/*
 * Mobile only.
 *
 * MOBILE_CENTRE_ASPECT is the centre photo's width as a share of its
 * height. 0.65 puts it at 310px on a 440x956 phone, down from the 359px
 * that 0.75 gave — a narrower, more upright card. Expressed as a ratio
 * rather than a pixel width so it holds its proportions on every
 * handset instead of only the one it was measured on.
 *
 * MOBILE_SIDE_LIFT raises the side photos off the centre card's bottom
 * edge. They used to sit flush with it; this lifts them clear so they
 * read as their own thing peeking in rather than as a continuation of
 * the centre photo's baseline.
 */
const MOBILE_CENTRE_ASPECT = 0.65;
const MOBILE_SIDE_LIFT = 100;

/*
 * Wraps an index into range for a carousel of `count` items. Takes count
 * as a real argument rather than reading a module-level constant: this
 * used to read GALLERY_ITEM_COUNT, a build-time constant computed once
 * from a hardcoded array, which silently went stale the moment items
 * became a real add/remove list whose actual length is only known at
 * render time.
 */
const getLoopedIndex = (index, count) => {
  return (index + count) % count;
};

export default function GalleryClient({ heading, text, items: galleryItems }) {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const carouselRef = useRef(null);

  const [cursorVisible, setCursorVisible] = useState(false);
  const cursorRef = useRef(null);
  const cursorMoveXRef = useRef(null);
  const cursorMoveYRef = useRef(null);

  const cardRefs = useRef([]);
  const imageWrapperRefs = useRef([]);
  const contentRefs = useRef([]);

  const activeIndexRef = useRef(0);
  const animationRef = useRef(null);

  const dragStateRef = useRef({
    isDragging: false,
    pointerId: null,
    startX: 0,
    currentX: 0,
    startTime: 0,
    moved: false,
    basePositions: [],
    startCardIndex: null,
    pointerType: "mouse",
  });

  const ignoreClickRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /*
   * A JS-driven cursor rather than the native CSS `cursor` property — see
   * ProjectGalleryClient for why: browsers cap how large a native cursor
   * image can render, so a real element positioned under the pointer is
   * the only way to show this icon at full size in every browser.
   *
   * Visibility is decided by testing the pointer's position against the
   * PHOTOGRAPHS, not against the carousel's box. The icon invites a
   * drag, and only the photos are draggable — over the cream space
   * around them, or the caption beneath, the ordinary arrow is the
   * honest cursor.
   *
   * Tested by hit-testing each visible card's image rather than by
   * onMouseEnter/onMouseLeave on them — this carousel calls
   * setPointerCapture during a drag (see handlePointerDown below), and a
   * captured pointer can leave the visible area without ever firing
   * mouseleave, which would leave the icon stuck on screen after a drag
   * ends elsewhere.
   *
   * The crucial part is WHEN that test runs. It used to run only on
   * pointermove, which meant the pointer had to move for anything to
   * change — and scrolling does not move the pointer. Scrolling the
   * carousel up under a stationary pointer left the icon hidden until
   * the mouse was jiggled or clicked, and scrolling the carousel away
   * left the icon stranded on screen over the rest of the page. So the
   * same test also runs whenever the page scrolls or resizes, against
   * the last position the pointer was seen at.
   */
  useEffect(() => {
    const cursor = cursorRef.current;

    if (!cursor) {
      return undefined;
    }

    cursorMoveXRef.current = gsap.quickTo(cursor, "x", {
      duration: 0.12,
      ease: "power3.out",
    });

    cursorMoveYRef.current = gsap.quickTo(cursor, "y", {
      duration: 0.12,
      ease: "power3.out",
    });

    let wasInside = false;

    /*
     * Where the pointer was last seen. Needed because a scroll has to be
     * judged against a position it cannot itself report.
     */
    let pointerX = 0;
    let pointerY = 0;
    let pointerKnown = false;

    /*
     * True while the pointer is over one of the photographs on screen.
     *
     * Only the cards at centre/left/right are on screen — the rest are
     * parked at data-position="hidden" — and it is the image wrapper
     * that is tested, not the card, because a card's box also contains
     * the caption below the photo.
     */
    const isOverAPhoto = () => {
      const cards = cardRefs.current;

      for (let index = 0; index < cards.length; index += 1) {
        const card = cards[index];

        if (!card || card.dataset.position === "hidden") {
          continue;
        }

        const image = imageWrapperRefs.current[index];

        if (!image) {
          continue;
        }

        const rect = image.getBoundingClientRect();

        if (
          pointerX >= rect.left &&
          pointerX <= rect.right &&
          pointerY >= rect.top &&
          pointerY <= rect.bottom
        ) {
          return true;
        }
      }

      return false;
    };

    const evaluate = () => {
      if (!pointerKnown) {
        return;
      }

      /*
       * A drag in progress keeps the icon regardless of where the
       * pointer has travelled to. The gesture started on a photo and
       * still owns the pointer, so losing the icon part way through it
       * would read as the drag having been dropped.
       */
      const isInside = dragStateRef.current.isDragging || isOverAPhoto();

      /*
       * Placed instantly on the way in, so it does not glide across the
       * screen from wherever it was last left. Only the following moves
       * are smoothed.
       */
      if (isInside && !wasInside) {
        gsap.set(cursor, { x: pointerX, y: pointerY });
      }

      wasInside = isInside;

      setCursorVisible(isInside);

      if (isInside) {
        cursorMoveXRef.current?.(pointerX);
        cursorMoveYRef.current?.(pointerY);
      }
    };

    const handlePointerMove = (event) => {
      if (event.pointerType !== "mouse") {
        return;
      }

      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerKnown = true;

      evaluate();
    };

    /*
     * Coalesced to one check per frame: this runs on scroll, and reading
     * a bounding box is a layout read — doing it per scroll event on a
     * page this animation-heavy would be a needless cost.
     */
    let queued = false;

    const handleReflow = () => {
      if (queued) {
        return;
      }

      queued = true;

      window.requestAnimationFrame(() => {
        queued = false;
        evaluate();
      });
    };

    const handlePointerLeaveWindow = () => {
      wasInside = false;
      pointerKnown = false;
      setCursorVisible(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("scroll", handleReflow, { passive: true });
    window.addEventListener("resize", handleReflow);
    /*
     * The end of a drag has to be re-tested too. A drag keeps the icon
     * wherever the pointer travels, so releasing over the caption or the
     * cream space left the icon showing with nothing under it to justify
     * it. handleReflow defers to the next frame, which is what makes
     * this correct regardless of whether this listener or the
     * carousel's own pointerup handler runs first — by then the drag
     * flag has been cleared either way.
     */
    window.addEventListener("pointerup", handleReflow);
    window.addEventListener("pointercancel", handleReflow);
    window.addEventListener("pointerleave", handlePointerLeaveWindow);
    window.addEventListener("blur", handlePointerLeaveWindow);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleReflow);
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("pointerup", handleReflow);
      window.removeEventListener("pointercancel", handleReflow);
      window.removeEventListener("pointerleave", handlePointerLeaveWindow);
      window.removeEventListener("blur", handlePointerLeaveWindow);
    };
  }, []);

  /*
   * Desktop dimensions:
   *
   * Centre: 8 of 12 page columns wide (see the desktop tier below),
   *         900 × 600's own 3:2 aspect ratio preserved at any width
   * Side:   210 × 446
   *
   * Mobile (≤767px) is driven by viewport height instead: the centre
   * card is a tall 50vh portrait card rather than a short landscape
   * strip, so it reads as "vertical" and fills most of the screen.
   */
  /*
   * The caption's own footprint: its height plus the gap above it. The
   * carousel has to reserve this under the photo, and the height budget
   * has to subtract it.
   *
   * Any caption will do, because they are all laid out at the same wrap
   * width — see --gallery-caption-width in the module CSS. Before that
   * variable existed each caption wrapped to its own card's width, so
   * this read the first card's, which is only the centre card until the
   * first swipe moves it out to the side.
   */
  const getCaptionBlock = useCallback(() => {
    const content = contentRefs.current.find(Boolean);

    if (!content) {
      return 0;
    }

    const style = window.getComputedStyle(content);

    return content.offsetHeight + (parseFloat(style.marginTop) || 0);
  }, []);

  /*
   * Everything stacked ABOVE the photo: the fixed header's clearance,
   * the section's own top padding, and the heading block with its
   * margins. Subtracting this from the viewport gives the height the
   * photo can actually occupy and still be seen whole.
   *
   * Measured from the DOM rather than written down as a number. This
   * section has already been broken twice by a hand-tuned pixel figure
   * drifting out of step with the CSS around it — the .carousel comment
   * in the module CSS documents one of those repairs, replacing a 740px
   * guess with a 960px one. A measured value cannot drift. The heading's
   * MARGINS are part of it too: reading offsetHeight alone missed its
   * 72px bottom margin and left the budget 72px optimistic.
   *
   * Deliberately excludes the caption. Reserving that as well left the
   * photo under 420px tall on an ordinary laptop, which is a large
   * change to an approved composition; the photo is the content, so it
   * is what gets guaranteed, and the caption sits just under the fold a
   * nudge away.
   */
  const getSpaceAbovePhoto = useCallback(() => {
    const section = sectionRef.current;

    if (!section) {
      return 0;
    }

    const paddingTop =
      parseFloat(window.getComputedStyle(section).paddingTop) || 0;

    const heading = headingRef.current;
    let headingOuter = 0;

    if (heading) {
      const headingStyle = window.getComputedStyle(heading);

      headingOuter =
        heading.offsetHeight +
        (parseFloat(headingStyle.marginTop) || 0) +
        (parseFloat(headingStyle.marginBottom) || 0);
    }

    /*
     * Read from the scroll-padding the page already sets for the fixed
     * header (see globals.css) rather than restating its height here.
     * This section carries one of the page's scroll-snap points, so it
     * comes to rest that far down the viewport rather than at the top.
     */
    const headerClearance =
      parseFloat(
        window.getComputedStyle(document.documentElement).scrollPaddingTop,
      ) || 0;

    return headerClearance + paddingTop + headingOuter;
  }, []);

  /*
   * Desktop dimensions:
   *
   * Centre: 8 of 12 page columns wide (see the desktop tier below),
   *         900 × 600's own 3:2 aspect ratio preserved at any width
   * Side:   210 × 446
   *
   * Mobile (≤767px) is driven by viewport height instead: the centre
   * card is a tall 50vh portrait card rather than a short landscape
   * strip, so it reads as "vertical" and fills most of the screen.
   */
  const getResponsiveSizes = useCallback(() => {
    const viewportWidth = carouselRef.current?.clientWidth || window.innerWidth;

    if (viewportWidth <= 480) {
      /*
       * Mobile centre card: 50% of the *viewport's height* (not the
       * old width-driven 3:2 landscape crop) — a tall, portrait card
       * that reads as "vertical" and fills most of the screen, rather
       * than a short strip. 0.75 (3:4) is a portrait aspect ratio;
       * the viewportWidth cap keeps it from ever overflowing sideways
       * on unusually tall/narrow devices.
       */
      const centreHeight = window.innerHeight * 0.5;
      const centreWidth = Math.min(
        centreHeight * MOBILE_CENTRE_ASPECT,
        viewportWidth * 0.86,
      );

      const sideWidth = Math.max(48, viewportWidth * 0.11);
      const sideHeight = sideWidth * (446 / 210);

      return {
        centreWidth,
        centreHeight,
        sideWidth,
        sideHeight,
        /*
         * Bottom-aligned with the centre photo, then lifted clear of
         * it. Floored at 0 so a very short screen cannot push them
         * above the top of the carousel.
         */
        sideYOffset: Math.max(0, centreHeight - sideHeight - MOBILE_SIDE_LIFT),
      };
    }

    if (viewportWidth <= 767) {
      const centreHeight = window.innerHeight * 0.5;
      const centreWidth = Math.min(
        centreHeight * MOBILE_CENTRE_ASPECT,
        viewportWidth * 0.86,
      );

      const sideWidth = Math.max(62, viewportWidth * 0.13);
      const sideHeight = sideWidth * (446 / 210);

      return {
        centreWidth,
        centreHeight,
        sideWidth,
        sideHeight,
        /* See the note on the branch above. */
        sideYOffset: Math.max(0, centreHeight - sideHeight - MOBILE_SIDE_LIFT),
      };
    }

    /*
     * Tablet and desktop: the photo's width is chosen from the
     * viewport's WIDTH, then capped by the height actually left over
     * once the heading, caption and padding are accounted for.
     *
     * Without that cap the height fell out of the width alone, and on
     * any ordinary laptop the result did not fit: on a 1600x900 screen
     * the photo came out 711px tall inside a 385px budget, which put
     * the caption naming the amenity 206px below the fold, and the
     * photograph itself ran 158px past the bottom of the screen. The
     * cap only bites when the window is too short for the full width,
     * so a tall display still gets the intended 8-of-12 columns.
     */
    let widthCap;
    let sideWidth;

    if (viewportWidth <= 1024) {
      widthCap = Math.min(560, viewportWidth * 0.58);
      sideWidth = 138;
    } else if (viewportWidth <= 1350) {
      widthCap = Math.min(620, viewportWidth * 0.5);
      sideWidth = 175;
    } else {
      /*
       * 8 of the page's 12 columns wide, same technique as Hero's
       * framed building photo (Hero.module.css .imageFrame): 66.667vw
       * is 8/12 of the viewport, capped so it doesn't grow
       * unreasonably large on very wide screens.
       */
      widthCap = Math.min(viewportWidth * 0.66667, 1100);
      sideWidth = 210;
    }

    const heightBudget = Math.max(
      MIN_CENTRE_HEIGHT,
      window.innerHeight - getSpaceAbovePhoto(),
    );

    const centreHeight = Math.min(widthCap / CENTRE_ASPECT, heightBudget);
    const centreWidth = centreHeight * CENTRE_ASPECT;

    /*
     * The side cards are bottom-aligned against the centre photo, so a
     * side card taller than the centre would hang above it. Scaled down
     * proportionally rather than clipped, so its own crop is preserved.
     */
    let sideHeight = sideWidth * SIDE_ASPECT;

    if (sideHeight > centreHeight) {
      sideWidth *= centreHeight / sideHeight;
      sideHeight = centreHeight;
    }

    return {
      centreWidth,
      centreHeight,
      sideWidth,
      sideHeight,
      sideYOffset: centreHeight - sideHeight,
    };
  }, [getSpaceAbovePhoto]);

  const getCardPosition = useCallback(
    (cardIndex, nextActiveIndex) => {
      if (cardIndex === nextActiveIndex) {
        return "centre";
      }

      if (
        cardIndex === getLoopedIndex(nextActiveIndex - 1, galleryItems.length)
      ) {
        return "left";
      }

      if (
        cardIndex === getLoopedIndex(nextActiveIndex + 1, galleryItems.length)
      ) {
        return "right";
      }

      return "hidden";
    },
    [galleryItems.length],
  );

  const getCardState = useCallback(
    (cardIndex, nextActiveIndex) => {
      const carousel = carouselRef.current;

      if (!carousel) {
        return null;
      }

      const { centreWidth, centreHeight, sideWidth, sideHeight, sideYOffset } =
        getResponsiveSizes();

      const carouselWidth = carousel.clientWidth;
      const position = getCardPosition(cardIndex, nextActiveIndex);

      const leftX = -(carouselWidth / 2) + sideWidth / 2;
      const rightX = carouselWidth / 2 - sideWidth / 2;

      if (position === "centre") {
        return {
          position: "centre",
          x: 0,
          y: 0,
          width: centreWidth,
          imageHeight: centreHeight,
          cardOpacity: 1,
          contentOpacity: 1,
          contentY: 0,
          visibility: "visible",
          zIndex: 4,
          pointerEvents: "auto",
        };
      }

      if (position === "left") {
        return {
          position: "left",
          x: leftX,
          y: sideYOffset,
          width: sideWidth,
          imageHeight: sideHeight,
          cardOpacity: 0.62,
          contentOpacity: 0,
          contentY: 14,
          visibility: "visible",
          zIndex: 2,
          pointerEvents: "auto",
        };
      }

      if (position === "right") {
        return {
          position: "right",
          x: rightX,
          y: sideYOffset,
          width: sideWidth,
          imageHeight: sideHeight,
          cardOpacity: 0.62,
          contentOpacity: 0,
          contentY: 14,
          visibility: "visible",
          zIndex: 2,
          pointerEvents: "auto",
        };
      }

      return {
        position: "hidden",
        x: 0,
        y: sideYOffset,
        width: sideWidth,
        imageHeight: sideHeight,
        cardOpacity: 0,
        contentOpacity: 0,
        contentY: 14,
        visibility: "hidden",
        zIndex: 1,
        pointerEvents: "none",
      };
    },
    [getCardPosition, getResponsiveSizes],
  );

  const positionCards = useCallback(
    ({ nextActiveIndex, immediate = false, duration = 1.05, onComplete }) => {
      const cards = cardRefs.current;
      const imageWrappers = imageWrapperRefs.current;
      const contents = contentRefs.current;

      const allElementsReady =
        cards.filter(Boolean).length === galleryItems.length &&
        imageWrappers.filter(Boolean).length === galleryItems.length &&
        contents.filter(Boolean).length === galleryItems.length;

      if (!allElementsReady) {
        onComplete?.();
        return;
      }

      animationRef.current?.kill();
      animationRef.current = null;

      /*
       * The stage's own height. Cards are absolutely positioned, so
       * they contribute nothing to it, and the CSS used to carry a
       * hard-coded 960px for the whole thing to size around — a figure
       * that had already been re-tuned once and was reserving 91px of
       * dead space below the caption at the same time as the caption
       * itself sat off screen.
       *
       * Set from the geometry that was just calculated instead, so the
       * section is exactly as tall as its contents on every viewport.
       */
      const stage = carouselRef.current;

      if (stage) {
        const { centreWidth, centreHeight } = getResponsiveSizes();

        /*
         * Published before the caption is measured, not after: it is
         * what the caption wraps at, so the measurement below is only
         * meaningful once it is current for this viewport.
         */
        stage.style.setProperty(
          "--gallery-caption-width",
          `${Math.round(centreWidth)}px`,
        );

        stage.style.height = `${Math.round(centreHeight + getCaptionBlock())}px`;
      }

      if (immediate) {
        cards.forEach((card, index) => {
          const imageWrapper = imageWrappers[index];
          const content = contents[index];
          const state = getCardState(index, nextActiveIndex);

          if (!card || !imageWrapper || !content || !state) {
            return;
          }

          card.dataset.position = state.position;

          gsap.set(card, {
            xPercent: -50,
            x: state.x,
            y: state.y,
            width: state.width,
            autoAlpha: state.cardOpacity,
            visibility: state.visibility,
            zIndex: state.zIndex,
            pointerEvents: state.pointerEvents,
          });

          gsap.set(imageWrapper, {
            height: state.imageHeight,
          });

          gsap.set(content, {
            autoAlpha: state.contentOpacity,
            y: state.contentY,
          });
        });

        onComplete?.();
        return;
      }

      const timeline = gsap.timeline({
        defaults: {
          overwrite: "auto",
        },

        onComplete: () => {
          cards.forEach((card, index) => {
            const state = getCardState(index, nextActiveIndex);

            if (!card || !state) {
              return;
            }

            card.dataset.position = state.position;

            gsap.set(card, {
              visibility: state.visibility,
              pointerEvents: state.pointerEvents,
              zIndex: state.zIndex,
            });
          });

          animationRef.current = null;
          onComplete?.();
        },

        onInterrupt: () => {
          animationRef.current = null;
        },
      });

      animationRef.current = timeline;

      cards.forEach((card, index) => {
        const imageWrapper = imageWrappers[index];
        const content = contents[index];
        const state = getCardState(index, nextActiveIndex);

        if (!card || !imageWrapper || !content || !state) {
          return;
        }

        const previousPosition = card.dataset.position;
        const isCurrentlyHidden = previousPosition === "hidden";
        const willBecomeHidden = state.position === "hidden";

        /*
         * Hidden card enters directly from its new edge
         * rather than travelling visibly behind the centre.
         */
        if (isCurrentlyHidden && !willBecomeHidden) {
          gsap.set(card, {
            xPercent: -50,
            x: state.x,
            y: state.y,
            width: state.width,
            autoAlpha: 0,
            visibility: "visible",
            zIndex: state.zIndex,
            pointerEvents: "none",
          });

          gsap.set(imageWrapper, {
            height: state.imageHeight,
          });

          gsap.set(content, {
            autoAlpha: 0,
            y: state.contentY,
          });

          card.dataset.position = state.position;

          timeline.to(
            card,
            {
              autoAlpha: state.cardOpacity,
              pointerEvents: state.pointerEvents,
              duration: 0.48,
              ease: "power3.out",
            },
            duration * 0.46,
          );

          return;
        }

        /*
         * Card leaving the visible carousel fades out
         * without looping visibly behind the images.
         */
        if (willBecomeHidden) {
          timeline.to(
            content,
            {
              autoAlpha: 0,
              y: 14,
              duration: 0.24,
              ease: "power2.in",
            },
            0,
          );

          timeline.to(
            card,
            {
              autoAlpha: 0,
              pointerEvents: "none",
              duration: 0.4,
              ease: "power2.in",
            },
            0,
          );

          timeline.set(
            card,
            {
              visibility: "hidden",
              zIndex: 1,
            },
            0.41,
          );

          timeline.set(
            imageWrapper,
            {
              height: state.imageHeight,
            },
            0.41,
          );

          card.dataset.position = "hidden";

          return;
        }

        card.dataset.position = state.position;

        timeline.to(
          card,
          {
            xPercent: -50,
            x: state.x,
            y: state.y,
            width: state.width,
            autoAlpha: state.cardOpacity,
            visibility: "visible",
            zIndex: state.zIndex,
            pointerEvents: state.pointerEvents,
            duration,
            ease: "power4.inOut",
          },
          0,
        );

        timeline.to(
          imageWrapper,
          {
            height: state.imageHeight,
            duration,
            ease: "power4.inOut",
          },
          0,
        );

        if (state.position === "centre") {
          timeline.to(
            content,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.5,
              ease: "power3.out",
            },
            duration * 0.54,
          );
        } else {
          timeline.to(
            content,
            {
              autoAlpha: 0,
              y: 14,
              duration: 0.24,
              ease: "power2.in",
            },
            0,
          );
        }
      });
    },
    [getCardState, galleryItems.length, getCaptionBlock, getResponsiveSizes],
  );

  const selectSlide = useCallback(
    (nextIndex) => {
      if (isAnimating || nextIndex === activeIndexRef.current) {
        return;
      }

      setIsAnimating(true);

      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);

      positionCards({
        nextActiveIndex: nextIndex,
        duration: 1.05,

        onComplete: () => {
          setIsAnimating(false);
        },
      });
    },
    [isAnimating, positionCards],
  );

  const showPrevious = useCallback(() => {
    selectSlide(
      getLoopedIndex(activeIndexRef.current - 1, galleryItems.length),
    );
  }, [selectSlide, galleryItems.length]);

  const showNext = useCallback(() => {
    selectSlide(
      getLoopedIndex(activeIndexRef.current + 1, galleryItems.length),
    );
  }, [selectSlide, galleryItems.length]);

  /*
   * Return cards to their normal position when a drag
   * is released without reaching the switching threshold.
   */
  const resetAfterDrag = useCallback(() => {
    const cards = cardRefs.current.filter(Boolean);

    const timeline = gsap.timeline({
      defaults: {
        overwrite: true,
      },

      onComplete: () => {
        animationRef.current = null;
      },
    });

    animationRef.current = timeline;

    cards.forEach((card, index) => {
      const state = getCardState(index, activeIndexRef.current);

      if (!state || state.position === "hidden") {
        return;
      }

      timeline.to(
        card,
        {
          x: state.x,
          duration: 0.62,
          ease: "power3.out",
        },
        0,
      );
    });
  }, [getCardState]);

  const handlePointerDown = useCallback(
    (event) => {
      if (isAnimating || event.button > 0) {
        return;
      }

      const carousel = carouselRef.current;

      if (!carousel) {
        return;
      }

      animationRef.current?.kill();
      animationRef.current = null;

      const basePositions = cardRefs.current.map((card, index) => {
        const state = getCardState(index, activeIndexRef.current);

        return {
          card,
          position: state?.position,
          baseX: state?.x ?? 0,
        };
      });

      // Record which card the pointer actually went down on. Needed
      // because pointer capture (below) means finishPointerDrag always
      // fires on the carousel element itself, not on whichever card
      // was under the cursor, so we can't wait and find out later.
      const cardElement = event.target.closest("[data-card-index]");
      const startCardIndex = cardElement
        ? Number(cardElement.dataset.cardIndex)
        : null;

      dragStateRef.current = {
        isDragging: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        currentX: event.clientX,
        startTime: performance.now(),
        moved: false,
        basePositions,
        startCardIndex,
        pointerType: event.pointerType,
      };

      ignoreClickRef.current = false;

      carousel.setPointerCapture?.(event.pointerId);

      setIsDragging(true);
    },
    [getCardState, isAnimating],
  );

  const handlePointerMove = useCallback((event) => {
    const dragState = dragStateRef.current;

    if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
      return;
    }

    const rawDistance = event.clientX - dragState.startX;
    const resistedDistance = rawDistance * DRAG_RESISTANCE;

    dragState.currentX = event.clientX;

    if (Math.abs(rawDistance) > 5) {
      dragState.moved = true;
    }

    dragState.basePositions.forEach(({ card, position, baseX }) => {
      if (!card || position === "hidden") {
        return;
      }

      let movement = resistedDistance;

      /*
       * Side cards move slightly less than the centre,
       * creating a subtle depth effect during dragging.
       */
      if (position === "left" || position === "right") {
        movement *= 0.86;
      }

      gsap.set(card, {
        x: baseX + movement,
      });
    });
  }, []);

  const finishPointerDrag = useCallback(
    (event) => {
      const dragState = dragStateRef.current;

      if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
        return;
      }

      const carousel = carouselRef.current;
      const distance = dragState.currentX - dragState.startX;
      const elapsed = Math.max(performance.now() - dragState.startTime, 1);

      const velocity = distance / elapsed;

      dragStateRef.current.isDragging = false;
      dragStateRef.current.pointerId = null;

      carousel?.releasePointerCapture?.(event.pointerId);

      setIsDragging(false);

      const shouldChangeSlide =
        Math.abs(distance) >= DRAG_DISTANCE_THRESHOLD ||
        Math.abs(velocity) >= DRAG_VELOCITY_THRESHOLD;

      if (!shouldChangeSlide) {
        resetAfterDrag();

        // Desktop-only: resolve this release as a tap on whichever card
        // the pointer went down on, instead of waiting for the native
        // "click" event. Some browsers redirect click's target to the
        // element that called setPointerCapture (the carousel div)
        // rather than the card button actually under the cursor, which
        // silently breaks mouse click-to-select in those browsers.
        //
        // Restricted to non-touch input on purpose: touch tapping was
        // already working correctly through the ordinary click event
        // below, so it's left completely untouched here.
        if (
          dragState.pointerType !== "touch" &&
          dragState.startCardIndex !== null &&
          dragState.startCardIndex !== activeIndexRef.current
        ) {
          selectSlide(dragState.startCardIndex);
        }

        return;
      }

      // Only suppress the click the browser fires right after
      // pointerup when a drag actually changed the slide, so that
      // click doesn't also re-trigger selectSlide for this same
      // interaction. Small incidental mouse movement that doesn't
      // cross the threshold above must never set this, or normal
      // clicks stop working (see finishPointerDrag notes below).
      ignoreClickRef.current = true;

      /*
       * Dragging left reveals the next image.
       * Dragging right reveals the previous image.
       */
      if (distance < 0) {
        showNext();
      } else {
        showPrevious();
      }

      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 80);
    },
    [resetAfterDrag, selectSlide, showNext, showPrevious],
  );

  const handlePointerCancel = useCallback(
    (event) => {
      const dragState = dragStateRef.current;

      if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
        return;
      }

      dragStateRef.current.isDragging = false;
      dragStateRef.current.pointerId = null;

      carouselRef.current?.releasePointerCapture?.(event.pointerId);

      setIsDragging(false);
      resetAfterDrag();
    },
    [resetAfterDrag],
  );

  const handleCardClick = useCallback(
    (event, index) => {
      if (ignoreClickRef.current) {
        event.preventDefault();
        ignoreClickRef.current = false;
        return;
      }

      selectSlide(index);
    },
    [selectSlide],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    },
    [showPrevious, showNext],
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      const heading = headingRef.current;
      const carousel = carouselRef.current;

      if (!section || !heading || !carousel) {
        return;
      }

      positionCards({
        nextActiveIndex: activeIndexRef.current,
        immediate: true,
      });

      const matchMedia = gsap.matchMedia();

      matchMedia.add(
        {
          desktop: "(min-width: 768px)",
          mobile: "(max-width: 767px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { mobile = false, reduceMotion = false } =
            context.conditions ?? {};

          if (reduceMotion) {
            gsap.set(heading.children, {
              autoAlpha: 1,
              y: 0,
            });

            return;
          }

          gsap.set(heading.children, {
            autoAlpha: 0,
            y: mobile ? 20 : 32,
          });

          /*
           * Gallery entrance reveals piece by piece rather than the
           * whole card fading in as one unit:
           *
           * 1. Centre image fades up.
           * 2. Centre title/description fades up shortly after.
           * 3. Left image fades up shortly after that.
           * 4. Right image fades up last, once the left image
           *    has finished.
           *
           * The card elements themselves keep whatever opacity
           * positionCards already gave them (1 for centre, 0.62 for
           * the sides, set earlier via the immediate positionCards
           * call above), so only the image and text pieces inside
           * each card animate here, not the cards themselves.
           */
          const fadeUpDistance = mobile ? 18 : 26;

          const centreCardIndex = cardRefs.current.findIndex(
            (card) => card?.dataset.position === "centre",
          );
          const leftCardIndex = cardRefs.current.findIndex(
            (card) => card?.dataset.position === "left",
          );
          const rightCardIndex = cardRefs.current.findIndex(
            (card) => card?.dataset.position === "right",
          );

          const centreImage =
            centreCardIndex >= 0
              ? imageWrapperRefs.current[centreCardIndex]
              : null;
          const centreContent =
            centreCardIndex >= 0 ? contentRefs.current[centreCardIndex] : null;
          const leftImage =
            leftCardIndex >= 0 ? imageWrapperRefs.current[leftCardIndex] : null;
          const rightImage =
            rightCardIndex >= 0
              ? imageWrapperRefs.current[rightCardIndex]
              : null;

          /*
           * The centre card's title and description fade up
           * one at a time rather than as a single fused block.
           */
          const centreContentChildren = centreContent
            ? Array.from(centreContent.children)
            : [];

          const revealPieces = [
            centreImage,
            ...centreContentChildren,
            leftImage,
            rightImage,
          ].filter(Boolean);

          if (revealPieces.length) {
            gsap.set(revealPieces, { autoAlpha: 0, y: fadeUpDistance });
          }

          const entranceTimeline = gsap.timeline({ paused: true });

          entranceTimeline.to(heading.children, {
            autoAlpha: 1,
            y: 0,
            duration: ENTRANCE_DURATION,
            stagger: ENTRANCE_STAGGER,
            ease: ENTRANCE_EASE,
          });

          if (centreImage) {
            entranceTimeline.to(
              centreImage,
              {
                autoAlpha: 1,
                y: 0,
                duration: ENTRANCE_DURATION,
                ease: ENTRANCE_EASE,
              },
              "-=0.42",
            );
          }

          if (centreContentChildren.length) {
            entranceTimeline.to(
              centreContentChildren,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                stagger: ENTRANCE_STAGGER,
                ease: ENTRANCE_EASE,
              },
              "<+=0.16",
            );
          }

          if (leftImage) {
            entranceTimeline.to(
              leftImage,
              {
                autoAlpha: 1,
                y: 0,
                duration: ENTRANCE_DURATION,
                ease: ENTRANCE_EASE,
              },
              "<+=0.22",
            );
          }

          /*
           * The right image only starts once the left
           * image's reveal has finished, rather than
           * overlapping with it.
           */
          if (rightImage) {
            entranceTimeline.to(rightImage, {
              autoAlpha: 1,
              y: 0,
              duration: ENTRANCE_DURATION,
              ease: ENTRANCE_EASE,
            });
          }

          /*
           * Held until the page has settled, like every other
           * entrance on the site. A ScrollTrigger created during
           * hydration measures a page whose images have no height
           * yet, so "top 50%" resolved to roughly zero and this fired
           * before the section was anywhere near the screen — the
           * audit caught it firing with 0% of the section visible.
           */
          revealOnArrival({
            trigger: section,
            start: ENTRANCE_START,
            onReveal: () => entranceTimeline.play(),
          });

          return () => {
            entranceTimeline.kill();
          };
        },
      );

      let resizeTimer;

      const handleResize = () => {
        window.clearTimeout(resizeTimer);

        resizeTimer = window.setTimeout(() => {
          animationRef.current?.kill();
          animationRef.current = null;

          dragStateRef.current.isDragging = false;

          setIsDragging(false);
          setIsAnimating(false);

          positionCards({
            nextActiveIndex: activeIndexRef.current,
            immediate: true,
          });
        }, 100);
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.clearTimeout(resizeTimer);
        window.removeEventListener("resize", handleResize);

        animationRef.current?.kill();
        animationRef.current = null;

        matchMedia.revert();
      };
    },
    {
      scope: sectionRef,
    },
  );

  return (
    <section
      ref={sectionRef}
      id="gallery"
      className={styles.gallery}
      aria-labelledby="gallery-title"
      onKeyDown={handleKeyDown}
    >
      <header ref={headingRef} className={styles.headingGroup}>
        <h2 id="gallery-title" className={styles.heading}>
          {heading}
        </h2>

        <p className={styles.text}>{text}</p>
      </header>

      <div
        ref={carouselRef}
        className={styles.carousel}
        data-dragging={isDragging ? "true" : "false"}
        role="region"
        aria-roledescription="carousel"
        aria-label="Movenpick lifestyle gallery. Drag horizontally to change image."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={handlePointerCancel}
      >
        {galleryItems.map((item, index) => {
          const initialPosition =
            index === 0
              ? "centre"
              : index === 1
                ? "right"
                : index === galleryItems.length - 1
                  ? "left"
                  : "hidden";

          const isCurrentSlide = index === activeIndex;

          return (
            <article
              key={item.image}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              className={styles.card}
              data-position={initialPosition}
              data-card-index={index}
              aria-hidden={
                initialPosition === "hidden" && !isCurrentSlide
                  ? "true"
                  : undefined
              }
            >
              <button
                type="button"
                className={styles.cardButton}
                disabled={isAnimating || isCurrentSlide}
                aria-label={
                  isCurrentSlide
                    ? `${item.title}, current image`
                    : `Show ${item.title}`
                }
                onClick={(event) => handleCardClick(event, index)}
              >
                <span
                  ref={(element) => {
                    imageWrapperRefs.current[index] = element;
                  }}
                  className={styles.imageWrapper}
                >
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    quality={90}
                    draggable={false}
                    sizes="
                      (max-width: 480px) 70.2vw,
                      (max-width: 767px) 66.6vw,
                      (max-width: 1024px) 58vw,
                      (max-width: 1350px) 50vw,
                      900px
                    "
                    className={styles.image}
                  />
                </span>
              </button>

              <div
                ref={(element) => {
                  contentRefs.current[index] = element;
                }}
                className={styles.cardContent}
              >
                <h3 className={styles.cardTitle}>{item.title}</h3>

                <p className={styles.cardDescription}>{item.description}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div
        ref={cursorRef}
        className={styles.customCursor}
        data-visible={cursorVisible ? "true" : "false"}
        aria-hidden="true"
      >
        <Image src="/images/drag-icon.svg" alt="" width={200} height={200} />
      </div>

      <div className={styles.pagination} aria-label="Gallery pagination">
        {galleryItems.map((item, index) => (
          <button
            key={item.image}
            type="button"
            className={styles.paginationButton}
            data-active={index === activeIndex ? "true" : "false"}
            aria-label={`Show ${item.title}`}
            aria-current={index === activeIndex ? "true" : undefined}
            disabled={isAnimating}
            onClick={() => selectSlide(index)}
          />
        ))}
      </div>
    </section>
  );
}
