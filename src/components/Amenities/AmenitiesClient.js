"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { revealOnArrival } from "@/lib/revealOnArrival";
import {
  ENTRANCE_DURATION,
  ENTRANCE_EASE,
  ENTRANCE_STAGGER,
  ENTRANCE_START,
  HERO_COPY_STAGGER,
} from "@/lib/motion";
import { applyVenetianMask, clearVenetianMask } from "@/lib/venetianMask";
import styles from "./Amenities.module.css";

/*
 * How far into the next stage a gesture has to carry before it counts
 * as asking for that stage, as a fraction of one stage's scroll.
 * Anything smaller is treated as staying where it is.
 */
const STAGE_COMMIT_THRESHOLD = 0.06;

/* How long the snap takes to carry one photograph into place. */
const STAGE_SNAP_DURATION = { min: 0.5, max: 0.8 };

/* Pause after the scroll stops before the snap takes over. */
const STAGE_SNAP_DELAY = 0.12;

export default function AmenitiesClient({
  heading,
  introText,
  items,
  ctaLabel,
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const introRef = useRef(null);
  const itemsGroupRef = useRef(null);
  const ctaGroupRef = useRef(null);
  const descriptionRef = useRef(null);
  /*
   * The height the closing paragraph had before the current swap.
   *
   * Each item's copy is a different length, so React replaces the text
   * and the paragraph resizes on the same frame — the rule above it and
   * the Submit button below it jump. Remembering the outgoing height is
   * what makes it possible to animate from it to the new one instead.
   */
  const descriptionHeightRef = useRef(null);
  const stageWrapperRef = useRef(null);
  const stagesEndRef = useRef(null);
  const imagePanelRef = useRef(null);
  const imageLayerRef = useRef(null);
  const progressFillRef = useRef(null);

  /*
   * One persistent wipe layer per item, stacked on top of each other,
   * rather than swapping a single <Image> in and out. Swapping meant
   * the outgoing photo vanished the instant the active index changed,
   * so the (beige) page background showed through underneath the new
   * photo's wipe instead of the previous photo — and remounting
   * next/image's <Image> on every swap re-triggered its load, which is
   * what made the transition feel janky rather than smooth. Keeping
   * all four mounted and simply re-ordering/animating their clip-paths
   * fixes both: the previous photo stays put underneath, so the new
   * one visibly opens over it, and nothing ever re-loads.
   */
  const imageLayersRef = useRef([]);
  const layerZIndexRef = useRef(0);
  const layerBlindRef = useRef([]);

  const isFirstSwapRef = useRef(true);
  const activeIndexRef = useRef(0);
  const stageTriggerRef = useRef(null);
  const isJumpingRef = useRef(false);

  /*
   * Where the last gesture came to rest, in stages. The snap steps ONE
   * stage from this rather than from wherever the scroll happens to be
   * (see snapToStage), so it is the snap's memory of the journey.
   *
   * A ref, not a closure variable, because jumpToStage has to write to
   * it too: clicking a heading moves the page several stages at once,
   * and a snap that afterwards still believes the reader is where they
   * started will step one stage from THERE and drag them somewhere
   * neither the click nor the scroll asked for.
   */
  const settledStageRef = useRef(0);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const headingEl = headingRef.current;
      const introEl = introRef.current;
      const itemsGroup = itemsGroupRef.current;
      const ctaGroup = ctaGroupRef.current;
      const imagePanel = imagePanelRef.current;
      const imageLayer = imageLayerRef.current;

      if (
        !section ||
        !headingEl ||
        !introEl ||
        !itemsGroup ||
        !ctaGroup ||
        !imagePanel ||
        !imageLayer
      ) {
        return;
      }

      const contentReveal = [headingEl, introEl, itemsGroup, ctaGroup];
      const matchMedia = gsap.matchMedia();

      matchMedia.add(
        {
          desktop: "(min-width: 1025px)",
          mobile: "(max-width: 767px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const {
            desktop = false,
            mobile = false,
            reduceMotion = false,
          } = context.conditions ?? {};

          if (reduceMotion) {
            clearVenetianMask(imagePanel);
            gsap.set(imageLayer, { clearProps: "transform" });
            gsap.set(contentReveal, { autoAlpha: 1, y: 0 });

            imageLayersRef.current.forEach((layer, index) => {
              if (!layer) return;

              clearVenetianMask(layer);
              gsap.set(layer, {
                zIndex: index === 0 ? imageLayersRef.current.length : index,
              });
            });

            layerZIndexRef.current = imageLayersRef.current.length;

            return;
          }

          /*
           * Content: heading, intro text, item list, then closing
           * text + button — each ENTRANCE_STAGGER after the previous,
           * same rhythm as every other entrance on the site.
           */
          gsap.set(contentReveal, {
            autoAlpha: 0,
            y: mobile ? 24 : 32,
          });

          const contentTimeline = gsap.timeline({ paused: true });

          /*
           * Heading, then the paragraph under it, then the item list,
           * then the closing group — on the same spacing the hero and
           * the project overview use, rather than the site-wide default
           * this section was still on.
           */
          contentTimeline.to(contentReveal, {
            autoAlpha: 1,
            y: 0,
            duration: ENTRANCE_DURATION,
            stagger: HERO_COPY_STAGGER,
            ease: ENTRANCE_EASE,
          });

          revealOnArrival({
            trigger: section,
            start: ENTRANCE_START,
            onReveal: () => contentTimeline.play(),
          });

          /*
           * Image: venetian blind reveal (see @/lib/venetianMask)
           * scrubbed to scroll position, the same move the Payment
           * section's photo makes. This is the FIRST reveal only — the
           * pinned, stage-by-stage journey below is a separate, later
           * scroll range. It masks .imagePanel itself (revealing
           * whichever item layer is on top — item 0 — beneath it); the
           * item layers' own clip-paths below are for swapping between
           * items, not this entrance.
           */
          const layers = imageLayersRef.current;

          layers.forEach((layer, index) => {
            if (!layer) return;

            gsap.set(layer, {
              zIndex: index === 0 ? layers.length : index,
            });

            /*
             * Item 0 is what the panel's own entrance blind reveals,
             * so it sits open underneath. The rest wait fully closed
             * for their turn in the pinned journey.
             */
            if (index === 0) {
              clearVenetianMask(layer);
            } else {
              applyVenetianMask(layer, 0);
            }
          });

          layerZIndexRef.current = layers.length;

          applyVenetianMask(imagePanel, 0);

          gsap.set(imageLayer, {
            scale: mobile ? 1.035 : 1.055,
            xPercent: mobile ? 2 : 4,
            transformOrigin: "center center",
          });

          /*
           * The tweens are built BEFORE the ScrollTrigger, and the
           * trigger is attached to the finished timeline rather than
           * declared inside gsap.timeline().
           *
           * This ordering is the whole fix for a photo that sometimes
           * never appeared. Declared the other way round, the trigger
           * was created while the timeline was still empty, measured a
           * zero-length animation, and cached its progress as 1.
           * Adding the tweens afterwards did not tell it anything had
           * changed, so every later refresh computed the same 1, saw no
           * change, and never rendered — the onUpdate below never ran,
           * and the closed mask applied a few lines above was never
           * replaced.
           *
           * Scrolling down through the range from above hid it, because
           * that drives progress 1 -> 0 -> 1 and forces a render. It
           * only showed when a visitor ARRIVED past the range with no
           * render to correct it: a reload part way down the page, the
           * browser restoring a position on back-navigation, a menu
           * jump, a deep link. Measured on a reload inside the section:
           * the panel's mask sat at zero opaque stops — invisible — and
           * stayed there through six seconds and any amount of local
           * scrolling. Only a trip back to the top of the page brought
           * the photograph back.
           */
          const blind = { progress: 0 };

          const imageTimeline = gsap.timeline({
            defaults: { ease: "none" },
          });

          imageTimeline
            .to(
              blind,
              {
                progress: 1,
                duration: 1,
                onUpdate: () => applyVenetianMask(imagePanel, blind.progress),
              },
              0,
            )
            .to(imageLayer, { scale: 1, xPercent: 0, duration: 1 }, 0);

          ScrollTrigger.create({
            animation: imageTimeline,
            trigger: section,
            /*
             * Ranged against when the PHOTO is on screen, not when
             * the section is.
             *
             * .imagePanel is absolutely positioned well below the
             * section's own top edge, so the original "top bottom"
             * to "top top" window was almost entirely spent while
             * the photo was still below the fold. The blind was
             * already a fifth open before any of it was visible and
             * finished as the panel settled, so all a visitor saw
             * was the tail. Starting at "top 62%" puts progress 0
             * at the moment the panel's top edge reaches the
             * viewport bottom, and "top -20%" lands the last slat
             * just before the pinned stage journey below takes
             * over - roughly a full viewport height of scroll to
             * play out across, the same as Payment's.
             */
            start: "top 62%",
            /*
             * Ends exactly where the section comes to rest, given as
             * an absolute scroll position rather than a geometric
             * offset.
             *
             * The header's scroll-padding means a section rests with
             * its top 90px below the viewport top, and a menu jump
             * now lands on precisely that position so the intro copy
             * is not tucked under the bar. This reveal is scrubbed
             * against scroll, so "finished" has to be that same
             * position or a visitor arriving from the menu meets a
             * half-drawn blind: measured at 68% open before this, and
             * still 81% when the end was merely nudged up by the
             * header's height.
             *
             * The honest cost is that the reveal now plays out over
             * about half a viewport instead of a full one. That is
             * the trade: it cannot both start when the photograph
             * becomes visible AND run a full viewport AND be finished
             * by the time the section settles, because those three
             * describe a longer stretch of scroll than actually
             * exists between them. Starting earlier was the
             * alternative, and it is the worse one — it is what this
             * trigger was moved AWAY from, because the blind was then
             * a fifth open before any of it was on screen.
             */
            end: () => {
              const headerHeight =
                parseFloat(
                  getComputedStyle(document.documentElement).getPropertyValue(
                    "--header-height",
                  ),
                ) || 90;

              return Math.max(
                1,
                section.getBoundingClientRect().top +
                  window.scrollY -
                  headerHeight,
              );
            },
            scrub: mobile ? 0.55 : 0.8,
            invalidateOnRefresh: true,

            /*
             * The mask is written straight to the DOM, so it can drift
             * from what the scroll position says whenever the scrub has
             * no reason to render — the case above, and any refresh
             * that lands on the progress the timeline already holds
             * (a resize, the page growing as images load). Restating it
             * here on every refresh means the photograph always agrees
             * with where the visitor actually is.
             */
            onRefresh: (self) => {
              blind.progress = self.progress;
              applyVenetianMask(imagePanel, self.progress);
            },
          });

          let stageTrigger;

          /*
           * Pinned, scroll-driven stages — desktop only. .stageWrapper is
           * a tall (items.length * 100vh) block; .stickyViewport inside
           * it is `position: sticky`, so it stays put on screen for that
           * entire scroll distance without needing GSAP's own pinning.
           * As the visitor scrolls through it, this maps scroll progress
           * (0 to 1) onto which item is "active" and how far the
           * continuous progress fill has grown — both a step index and a
           * smooth parallax drift on the photo, all from one number.
           */
          /*
           * Desktop and mobile both run the journey; the tablet tier
           * between them lays the section out flat and has no stage to
           * step through.
           */
          if (desktop || mobile) {
            const stageWrapper = stageWrapperRef.current;
            const progressFill = progressFillRef.current;

            if (stageWrapper && progressFill) {
              gsap.set(progressFill, {
                scaleY: 0,
                transformOrigin: "top center",
              });

              /*
               * One gesture, one photograph.
               *
               * Each stage occupies a fixed slice of the journey — 675px
               * of scroll at 1440x900 — and nothing was holding the
               * scroll to those slices. A mouse notch is well under
               * that, so it looked right on a mouse, but a trackpad
               * flick carries far more than one slice's worth of
               * momentum and skipped two or three photographs in a
               * single gesture.
               *
               * The snap quantises the scroll to the stage boundaries.
               * It is deliberately NOT GSAP's default velocity
               * projection, which asks "where would this gesture have
               * ended up" — that is exactly the question that lets a
               * hard flick fling past several stages. This asks where
               * the scroll actually IS and moves one stage from there,
               * so the size of the gesture stops mattering.
               *
               * COMMIT_THRESHOLD is the small amount of travel that
               * still counts as "staying put", so a stray pixel or two
               * does not advance a stage on its own.
               */
              const stageIncrement = 1 / items.length;

              /*
               * Where the last gesture came to rest. The next one moves
               * ONE stage from here, whatever its size.
               *
               * Quantising from the current scroll position was not
               * enough: a flick is a burst of wheel events, and by the
               * time the scroll stops and the snap runs, the page has
               * already travelled two or three stages. Snapping to the
               * nearest boundary from there simply confirmed the skip.
               * Stepping from the settled stage instead makes the size
               * of the gesture irrelevant.
               */
              const snapToStage = (naturalValue, self) => {
                const settledStage = settledStageRef.current;
                const raw = self.progress / stageIncrement;
                const forward = self.direction !== -1;
                const travelled = Math.abs(raw - settledStage);

                const index =
                  travelled < STAGE_COMMIT_THRESHOLD
                    ? settledStage
                    : settledStage + (forward ? 1 : -1);

                const clamped = gsap.utils.clamp(0, items.length, index);

                return gsap.utils.clamp(0, 1, clamped * stageIncrement);
              };

              stageTrigger = ScrollTrigger.create({
                trigger: stageWrapper,
                start: "top top",

                /*
                 * "bottom bottom" would spread the stages across the
                 * overlay runway too (see .stagesEnd in the stylesheet),
                 * giving four amenities five screens of scroll and a
                 * fifth stage with nothing in it. Ending at the marker
                 * keeps the stages owning exactly their own screens and
                 * leaves the runway over for the gallery to travel
                 * across.
                 */
                end: () =>
                  `+=${Math.max(
                    1,
                    (stagesEndRef.current?.offsetTop ??
                      stageWrapper.offsetHeight) - window.innerHeight,
                  )}`,
                scrub: 0.3,
                invalidateOnRefresh: true,

                snap: {
                  snapTo: snapToStage,
                  duration: STAGE_SNAP_DURATION,
                  delay: STAGE_SNAP_DELAY,
                  ease: "power2.inOut",

                  onComplete: (self) => {
                    settledStageRef.current = Math.round(
                      self.progress / stageIncrement,
                    );
                  },
                },

                /*
                 * Leaving the journey resyncs the settled stage to
                 * wherever the scroll actually is, so returning to the
                 * section — or arriving from a menu jump — steps from
                 * the stage on screen rather than from a stale one.
                 */
                onToggle: (self) => {
                  if (!self.isActive) {
                    settledStageRef.current = gsap.utils.clamp(
                      0,
                      items.length,
                      Math.round(self.progress / stageIncrement),
                    );
                  }
                },

                onUpdate: (self) => {
                  gsap.set(progressFill, { scaleY: self.progress });

                  gsap.set(imageLayer, {
                    yPercent: (self.progress - 0.5) * 6,
                  });

                  /*
                   * Skipped while a click-triggered jump (see
                   * jumpToStage below) is scrolling the page there
                   * programmatically — otherwise every intermediate
                   * step the scroll passes through on the way would
                   * flash its own swap animation before landing on
                   * the one actually clicked.
                   */
                  if (isJumpingRef.current) {
                    return;
                  }

                  /*
                   * Measured in scroll pixels, with a pixel and a half
                   * of tolerance, because the boundaries are exactly
                   * where the snap parks and a stage is rarely a whole
                   * number of pixels. At 375x667 one stage is 500.25px,
                   * so resting on stage 1 puts the scroll at 500 — half
                   * a pixel short. A bare floor() reads that as stage
                   * 0, and the section then looks like it ignored one
                   * scroll and skipped an amenity on the next.
                   */
                  const travel = self.end - self.start;
                  const stagePixels = travel / items.length;
                  const stepIndex = gsap.utils.clamp(
                    0,
                    items.length - 1,
                    Math.floor((self.progress * travel + 1.5) / stagePixels),
                  );

                  if (stepIndex !== activeIndexRef.current) {
                    activeIndexRef.current = stepIndex;
                    setActiveIndex(stepIndex);
                  }
                },
              });

              stageTriggerRef.current = stageTrigger;
            }
          }

          return () => {
            contentTimeline.kill();
            imageTimeline.kill();
            stageTrigger?.kill();
            stageTriggerRef.current = null;
          };
        },
      );

      return () => {
        matchMedia.revert();
      };
    },
    { scope: sectionRef, dependencies: [items.length] },
  );

  /*
   * Swapping the active item: the same venetian blind the panel's
   * entrance uses (see @/lib/venetianMask), but played over a fixed
   * duration rather than scrubbed, since a swap is a discrete event
   * rather than a scroll range. Driven by the pinned scroll journey on
   * desktop, or by hover/focus/click as a fallback everywhere the pin
   * is disabled.
   * Skipped only on this component's very first render — every change
   * after that runs it, regardless of whether the entrance timeline
   * above has fired yet. (An earlier version gated this on the entrance
   * timeline actually completing, which meant interacting with the
   * section before that finished silently disarmed it forever.)
   */
  useGSAP(
    () => {
      if (isFirstSwapRef.current) {
        isFirstSwapRef.current = false;

        /*
         * Seeded here rather than left null, so the very first swap
         * animates from a real height instead of jumping once and
         * behaving from then on.
         */
        if (descriptionRef.current) {
          descriptionHeightRef.current = descriptionRef.current.offsetHeight;
        }

        return;
      }

      const description = descriptionRef.current;
      const layer = imageLayersRef.current[activeIndex];

      if (!description || !layer) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      /*
       * Bring the incoming layer above every other item's layer before
       * animating it in, so it visibly wipes over whichever photo was
       * showing before — not the page background.
       */
      layerZIndexRef.current += 1;
      gsap.set(layer, { zIndex: layerZIndexRef.current });

      if (reduceMotion) {
        gsap.set([description, layer], { autoAlpha: 1 });
        clearVenetianMask(layer);

        return;
      }

      if (!layerBlindRef.current[activeIndex]) {
        layerBlindRef.current[activeIndex] = { progress: 0 };
      }

      const blind = layerBlindRef.current[activeIndex];

      /*
       * Grow or shrink to the new copy's height rather than snapping.
       *
       * By the time this runs React has already put the new text in, so
       * the natural height here is the DESTINATION. The height it is
       * animated from is the one remembered from before the swap.
       *
       * overflow is clamped for the duration so the longer of the two
       * texts cannot spill past the box while it is still the wrong
       * size, and both are cleared afterwards so the paragraph goes
       * back to sizing itself.
       */
      const previousHeight = descriptionHeightRef.current;
      const nextHeight = description.offsetHeight;

      descriptionHeightRef.current = nextHeight;

      if (previousHeight !== null && previousHeight !== nextHeight) {
        gsap.fromTo(
          description,
          { height: previousHeight, overflow: "hidden" },
          {
            height: nextHeight,
            duration: ENTRANCE_DURATION,
            ease: ENTRANCE_EASE,
            clearProps: "height,overflow",
          },
        );
      }

      gsap.set(description, { autoAlpha: 0, y: 16 });
      applyVenetianMask(layer, 0);

      gsap.to(description, {
        autoAlpha: 1,
        y: 0,
        duration: ENTRANCE_DURATION,
        ease: ENTRANCE_EASE,
      });

      gsap.fromTo(
        blind,
        { progress: 0 },
        {
          progress: 1,
          duration: ENTRANCE_DURATION,
          /*
           * Linear, unlike the text beside it. The blind's 30 slats
           * are already staggered across progress, so an eased
           * progress would bunch most of them into the opening
           * moments and leave the last few crawling. Even progress is
           * what makes it read as a blind rather than a smear.
           */
          ease: "none",
          overwrite: true,
          onUpdate: () => applyVenetianMask(layer, blind.progress),
        },
      );
    },
    { scope: sectionRef, dependencies: [activeIndex] },
  );

  const activeItem = items[activeIndex] ?? items[0];

  const selectIndex = (index) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  /*
   * Clicking a heading: on desktop, the active stage is normally
   * driven purely by scroll position, so just setting state (like
   * selectIndex above, used for hover/focus) would get overwritten by
   * the very next scroll tick's recomputed step — the click would
   * flash and immediately revert. Scrolling the page itself to a
   * point inside that stage's range makes the change actually stick,
   * and drives the progress bar along with it since that's fed by the
   * same real scroll position. Falls back to selectIndex wherever the
   * pin is disabled (tablet, mobile, reduced motion) and no stage
   * ScrollTrigger exists.
   *
   * Checks the trigger's *actual* live scroll progress, not
   * activeIndexRef — hovering a heading right before clicking it (the
   * normal way a mouse click happens) already moves activeIndexRef to
   * this same index via selectIndex, which would otherwise make this
   * look like "already there" and skip the scroll entirely.
   */
  const jumpToStage = (index) => {
    const trigger = stageTriggerRef.current;

    if (!trigger) {
      selectIndex(index);
      return;
    }

    const currentStep = Math.min(
      items.length - 1,
      Math.floor(trigger.progress * items.length),
    );

    if (currentStep === index) {
      selectIndex(index);
      return;
    }

    isJumpingRef.current = true;
    activeIndexRef.current = index;
    setActiveIndex(index);

    /*
     * Tell the snap where the reader now is, BEFORE the scroll starts.
     *
     * The snap does not move to the nearest stage — it deliberately
     * steps exactly one stage from the last settled one, so that the
     * size of a trackpad flick cannot fling past several photographs.
     * That makes it entirely dependent on settledStage being true, and
     * a click is the one thing that moves several stages at once.
     *
     * Left stale, the snap fired at the end of the jump and stepped one
     * stage from the ORIGINAL position: clicking the first heading from
     * the third landed on the first and was then dragged to the second.
     * Clicking the fourth from the first landed on the fourth and was
     * dragged back to the second. Both reverted to the same place
     * because both were "one stage from where you were".
     */
    settledStageRef.current = index;

    /*
     * The stage's own boundary, which is exactly where the snap parks a
     * settled stage. Aiming at the middle of the stage instead left the
     * snap with half a stage of travel to account for, and half a stage
     * is well past STAGE_COMMIT_THRESHOLD — so it would step again on
     * arrival even once it knew where it was.
     */
    const stageProgress = index / items.length;
    const targetY =
      trigger.start + stageProgress * (trigger.end - trigger.start);

    gsap.to(window, {
      scrollTo: { y: targetY, autoKill: true },
      duration: 0.9,
      ease: ENTRANCE_EASE,
      onComplete: () => {
        isJumpingRef.current = false;
      },
    });
  };

  return (
    <section
      ref={sectionRef}
      id="amenities"
      className={styles.amenities}
      aria-labelledby="amenities-heading"
    >
      <div className={styles.intro}>
        <h2 ref={headingRef} id="amenities-heading" className={styles.heading}>
          {heading}
        </h2>

        <p ref={introRef} className={styles.introText}>
          {introText}
        </p>
      </div>

      <div
        ref={stageWrapperRef}
        className={styles.stageWrapper}
        /*
         * The stage count, not a height. The height is worked out from
         * it in the stylesheet, which lets desktop add its overlay
         * runway on the end (see Amenities.module.css) without an
         * inline height overriding the rule that does it.
         */
        style={{ "--stage-count": items.length }}
      >
        {/*
         * Marks where the stages finish and the overlay runway begins.
         * The stage journey's ScrollTrigger ends here rather than at the
         * wrapper's bottom edge, which now sits a screen further down.
         *
         * A measured element rather than arithmetic on window
         * dimensions: the runway is a screen of `svh`, and on a phone
         * `svh` and window.innerHeight are different numbers that drift
         * apart as the address bar hides. Reading the position off the
         * page is exact at any moment.
         */}
        <span
          ref={stagesEndRef}
          className={styles.stagesEnd}
          aria-hidden="true"
        />

        <div className={styles.stickyViewport}>
          <div className={styles.body}>
            <div className={styles.content}>
              <div className={styles.itemsWrapper}>
                <div className={styles.progressTrack} aria-hidden="true">
                  <div ref={progressFillRef} className={styles.progressFill} />
                </div>

                <ul ref={itemsGroupRef} className={styles.items}>
                  {items.map((item, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        className={styles.item}
                        data-active={index === activeIndex}
                        onMouseEnter={() => selectIndex(index)}
                        onFocus={() => selectIndex(index)}
                        onClick={() => jumpToStage(index)}
                      >
                        <span className={styles.itemTitle}>{item.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/*
               * Spacers, not margins.
               *
               * The space above the divider and the space above the
               * button were fixed figures, and a fixed figure cannot
               * give way: once the copy grew past the height of the
               * held screen, the column simply overflowed and pushed
               * the closing group out of view. Measured at 1440x900,
               * the column needed 811px in a 720px box, which put the
               * button exactly on the bottom edge — and further out
               * with longer copy.
               *
               * As flex items they hold their designed size whenever
               * there is room and shrink towards nothing when there is
               * not, so the copy gives up whitespace rather than the
               * layout giving up the divider and the button.
               *
               * aria-hidden and empty: they are spacing, and a screen
               * reader has no use for them.
               */}
              <div className={styles.dividerSpace} aria-hidden="true" />

              <hr className={styles.divider} />

              <div ref={ctaGroupRef} className={styles.ctaGroup}>
                <p ref={descriptionRef} className={styles.ctaText}>
                  {activeItem.description}
                </p>

                {/* See the note above: the same, between the copy and the button. */}
                <div className={styles.ctaSpace} aria-hidden="true" />

                <button
                  type="button"
                  className={styles.requestButton}
                  data-contact-popup
                >
                  <span>{ctaLabel}</span>
                  <span className={styles.linkIcon} aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            </div>

            <div ref={imagePanelRef} className={styles.imagePanel}>
              <div ref={imageLayerRef} className={styles.imageLayer}>
                {items.map((item, index) => (
                  <div
                    key={index}
                    ref={(node) => {
                      imageLayersRef.current[index] = node;
                    }}
                    className={styles.imageWipe}
                  >
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      quality={90}
                      priority={index === 0}
                      sizes="(max-width: 767px) 100vw, 60vw"
                      className={styles.image}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
