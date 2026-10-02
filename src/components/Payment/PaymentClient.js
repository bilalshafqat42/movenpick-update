"use client";

import SafeImage from "@/components/SafeImage";
import { useRef, useState } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { revealOnArrival } from "@/lib/revealOnArrival";
import {
  ENTRANCE_DURATION,
  ENTRANCE_EASE,
  ENTRANCE_STAGGER,
  ENTRANCE_START,
} from "@/lib/motion";
import { applyVenetianMask, clearVenetianMask } from "@/lib/venetianMask";
import styles from "./Payment.module.css";

export default function PaymentClient({
  heading,
  text,
  image,
  imageFallback,
  imageAlt,
  milestones,
  /*
   * Overridable so the same layout can be placed again as another
   * section (see FloorPlan) with its own anchor and column names.
   */
  id = "payment-plan",
  titleId = "payment-title",
  columnLabels = ["Milestone", "%"],
  introInPanel = false,
  /*
   * Optional unit-type buttons under the intro (Floor Plan): each is
   * { label, image, alt }, and choosing one swaps the photo for its own.
   */
  units = null,
}) {
  const hasUnits = Array.isArray(units) && units.length > 0;
  const [activeUnit, setActiveUnit] = useState(0);

  const shownImage = hasUnits ? units[activeUnit].image : image;
  const shownAlt = hasUnits ? units[activeUnit].alt : imageAlt;

  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const textRef = useRef(null);
  const imagePanelRef = useRef(null);
  const imageLayerRef = useRef(null);
  const tableRef = useRef(null);
  const tableHeaderRef = useRef(null);
  const unitsRef = useRef(null);
  const unitDetailRef = useRef(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const headingEl = headingRef.current;
      const textEl = textRef.current;
      const imagePanel = imagePanelRef.current;
      const imageLayer = imageLayerRef.current;
      const table = tableRef.current;
      const tableHeader = tableHeaderRef.current;

      /*
       * With introInPanel the column headings sit above the heading as
       * its eyebrow, so they arrive with the intro rather than leading
       * the table's own sequence further down.
       */
      const introEls = introInPanel
        ? [
            tableHeader,
            headingEl,
            textEl,
            unitsRef.current,
            unitDetailRef.current,
          ].filter(Boolean)
        : [headingEl, textEl];

      if (
        !section ||
        !headingEl ||
        !textEl ||
        !imagePanel ||
        !imageLayer ||
        !table ||
        !tableHeader
      ) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion) {
        gsap.set([...introEls, tableHeader, table], {
          autoAlpha: 1,
          y: 0,
        });
        gsap.set(table.querySelectorAll(`.${styles.rowRule}`), { scaleX: 1 });
        clearVenetianMask(imagePanel);
        gsap.set(imageLayer, { clearProps: "transform" });

        return;
      }

      const mobile = window.matchMedia("(max-width: 767px)").matches;

      /*
       * Top heading + intro, same staggered rhythm as every other section.
       */
      gsap.set(introEls, { autoAlpha: 0, y: 24 });

      const introTrigger = revealOnArrival({
        trigger: section,
        start: ENTRANCE_START,

        onReveal: () => {
          gsap.to(introEls, {
            autoAlpha: 1,
            y: 0,
            duration: ENTRANCE_DURATION,
            stagger: ENTRANCE_STAGGER,
            ease: ENTRANCE_EASE,
          });
        },
      });

      /*
       * Photo: venetian blind reveal (see @/lib/venetianMask),
       * driven directly by scroll progress rather than a GSAP tween —
       * the mask-image is recomputed every scroll frame, so it's
       * pinned exactly to scroll position instead of playing out over
       * a fixed duration. The parallax drift on the layer underneath
       * (same scale/xPercent settle used elsewhere on the site) rides
       * along on the same progress value.
       */
      const layerStartScale = mobile ? 1.035 : 1.055;
      const layerStartXPercent = mobile ? 2 : 4;

      gsap.set(imageLayer, {
        scale: layerStartScale,
        xPercent: layerStartXPercent,
        transformOrigin: "center center",
      });

      applyVenetianMask(imagePanel, 0);

      const imageTrigger = ScrollTrigger.create({
        trigger: section,
        /*
         * The real problem wasn't just when this started — it's that
         * start/end were only ever a fraction of one viewport height
         * apart (e.g. "top 55%" to "top top" is just 55% of the
         * screen's worth of scrolling), so the whole 30-band reveal
         * had to finish within that short a distance, reading as
         * rushed/cut-off rather than something to actually watch
         * play out. Ending at "center center" instead of "top top"
         * gives it roughly a full viewport height of scroll distance
         * to complete across.
         */
        start: "top 90%",

        /*
         * Mobile ends at "top top" — the moment the section's own top
         * edge reaches the top of the screen, which on mobile is
         * exactly when the first of its two screens is fully open.
         *
         * "center center" is right on desktop, where the section is
         * about one and a quarter viewports tall. On mobile it is two
         * full screens, so the section's centre sits deep inside the
         * SECOND screen: the blind was only 64% open by the time the
         * photo was completely in view, which is why it was still
         * visibly striped once the section had finished arriving.
         */
        /*
         * Ends exactly where the section comes to rest, for the reason
         * given on the Amenities blind: menu jumps land on that
         * position so the copy clears the header, and a reveal scrubbed
         * against scroll has to call that same position "finished" or
         * it is still striped when the visitor arrives. Measured at 87%
         * open before this.
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
            section.getBoundingClientRect().top + window.scrollY - headerHeight,
          );
        },
        invalidateOnRefresh: true,

        onUpdate: (self) => {
          applyVenetianMask(imagePanel, self.progress);

          gsap.set(imageLayer, {
            scale: gsap.utils.interpolate(layerStartScale, 1, self.progress),
            xPercent: gsap.utils.interpolate(
              layerStartXPercent,
              0,
              self.progress,
            ),
          });
        },
      });

      /*
       * The milestone list arrives one beat at a time, alternating
       * between a milestone and the rule beneath it: the column
       * headings, then Booking, then Booking's rule, then the first
       * instalment, then its rule, and so on down the list.
       *
       * Beats are placed on an explicit clock rather than chained end to
       * end. Strictly sequential, each waiting for the last to finish,
       * the fifteen beats would take over seven seconds to play out;
       * starting each one BEAT_STEP after the previous started keeps it
       * legibly one-at-a-time while landing in about two.
       */
      const rows = Array.from(table.children);
      const rules = rows.map((row) => row.querySelector(`.${styles.rowRule}`));

      const BEAT_STEP = ENTRANCE_STAGGER * 0.8;
      const BEAT_DURATION = ENTRANCE_DURATION * 0.55;

      if (!introInPanel) {
        gsap.set(tableHeader, { autoAlpha: 0, y: 12 });
      }

      /*
       * Guarded because a table can be empty (Floor Plan, until its rows
       * are filled in), and GSAP warns about every set on no targets.
       */
      if (rows.length) {
        gsap.set(rows, { autoAlpha: 0, y: 18 });
      }

      if (rules.some(Boolean)) {
        gsap.set(rules.filter(Boolean), { scaleX: 0 });
      }

      const rowsTrigger = revealOnArrival({
        trigger: table,
        start: ENTRANCE_START,

        onReveal: () => {
          const timeline = gsap.timeline({
            defaults: { duration: BEAT_DURATION, ease: ENTRANCE_EASE },
          });

          let at = 0;

          if (!introInPanel) {
            timeline.to(tableHeader, { autoAlpha: 1, y: 0 }, at);
            at += BEAT_STEP;
          }

          rows.forEach((row, index) => {
            timeline.to(row, { autoAlpha: 1, y: 0 }, at);
            at += BEAT_STEP;

            const rule = rules[index];

            if (rule) {
              timeline.to(rule, { scaleX: 1 }, at);
              at += BEAT_STEP;
            }
          });
        },
      });

      return () => {
        introTrigger.kill();
        imageTrigger.kill();
        rowsTrigger.kill();
      };
    },
    { scope: sectionRef },
  );

  /*
   * The heading and its text: a centred block above the photo and table
   * by default, or with introInPanel at the top of the table's column.
   */
  const intro = (
    <div className={`${styles.intro} ${introInPanel ? styles.panelIntro : ""}`}>
      <h2 ref={headingRef} id={titleId} className={styles.heading}>
        {heading}
      </h2>

      <p ref={textRef} className={styles.text}>
        {text}
      </p>

      {hasUnits && (
        <div
          ref={unitsRef}
          className={styles.units}
          role="group"
          aria-label="Unit types"
        >
          {units.map((unit, index) => (
            <button
              key={unit.label}
              type="button"
              className={styles.unitButton}
              aria-pressed={index === activeUnit}
              onClick={() => setActiveUnit(index)}
            >
              {unit.label}
            </button>
          ))}
        </div>
      )}

      {/*
       * The chosen unit's own heading and description, under a rule.
       * The wrapper is stable so the entrance animation has one element
       * to reveal; the inner block is keyed on the selection so it
       * remounts and fades in each time a different unit is chosen.
       */}
      {hasUnits && (units[activeUnit].heading || units[activeUnit].text) && (
        <div ref={unitDetailRef} className={styles.unitDetail}>
          <hr className={styles.unitDivider} />

          <div
            key={activeUnit}
            className={styles.unitDetailBody}
            aria-live="polite"
          >
            {units[activeUnit].heading && (
              <h3 className={styles.unitHeading}>
                {units[activeUnit].heading}
              </h3>
            )}

            {units[activeUnit].text && (
              <p className={styles.unitText}>{units[activeUnit].text}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const tableHeaderEl = (
    <div ref={tableHeaderRef} className={styles.tableHeader}>
      <span>{columnLabels[0]}</span>
      <span>{columnLabels[1]}</span>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`${styles.payment} ${introInPanel ? styles.introInPanel : ""}`}
      aria-labelledby={titleId}
    >
      {!introInPanel && intro}

      <div className={styles.body}>
        <div
          ref={imagePanelRef}
          className={styles.imagePanel}
          data-plans={hasUnits || undefined}
        >
          <div ref={imageLayerRef} className={styles.imageLayer}>
            <SafeImage
              src={shownImage}
              fallbackSrc={imageFallback}
              alt={shownAlt}
              fill
              quality={90}
              sizes="(max-width: 767px) 100vw, 50vw"
              className={styles.image}
            />
          </div>
        </div>

        <div className={styles.tablePanel}>
          {introInPanel ? (
            <>
              {tableHeaderEl}
              {intro}
            </>
          ) : (
            tableHeaderEl
          )}

          <div ref={tableRef} className={styles.table}>
            {milestones.map((milestone, index) => (
              <div className={styles.row} key={index}>
                <div className={styles.rowTop}>
                  <span className={styles.rowLabel}>{milestone.label}</span>
                  <span className={styles.rowPercent}>{milestone.percent}</span>
                </div>

                <p className={styles.rowSublabel}>{milestone.sublabel}</p>

                {/*
                 * Omitted on the last milestone: the rule separates one
                 * from the next, so there is nothing for it to separate
                 * after the final one.
                 */}
                {index < milestones.length - 1 ? (
                  <span className={styles.rowRule} aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
