"use client";

import SafeImage from "@/components/SafeImage";
import { useRef } from "react";

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
}) {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const textRef = useRef(null);
  const imagePanelRef = useRef(null);
  const imageLayerRef = useRef(null);
  const tableRef = useRef(null);
  const tableHeaderRef = useRef(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const headingEl = headingRef.current;
      const textEl = textRef.current;
      const imagePanel = imagePanelRef.current;
      const imageLayer = imageLayerRef.current;
      const table = tableRef.current;
      const tableHeader = tableHeaderRef.current;

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
        gsap.set([headingEl, textEl, tableHeader, table], {
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
      gsap.set([headingEl, textEl], { autoAlpha: 0, y: 24 });

      const introTrigger = revealOnArrival({
        trigger: section,
        start: ENTRANCE_START,

        onReveal: () => {
          gsap.to([headingEl, textEl], {
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

      gsap.set(tableHeader, { autoAlpha: 0, y: 12 });
      gsap.set(rows, { autoAlpha: 0, y: 18 });
      gsap.set(rules.filter(Boolean), { scaleX: 0 });

      const rowsTrigger = revealOnArrival({
        trigger: table,
        start: ENTRANCE_START,

        onReveal: () => {
          const timeline = gsap.timeline({
            defaults: { duration: BEAT_DURATION, ease: ENTRANCE_EASE },
          });

          let at = 0;

          timeline.to(tableHeader, { autoAlpha: 1, y: 0 }, at);
          at += BEAT_STEP;

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

  return (
    <section
      ref={sectionRef}
      id="payment-plan"
      className={styles.payment}
      aria-labelledby="payment-title"
    >
      <div className={styles.intro}>
        <h2 ref={headingRef} id="payment-title" className={styles.heading}>
          {heading}
        </h2>

        <p ref={textRef} className={styles.text}>
          {text}
        </p>
      </div>

      <div className={styles.body}>
        <div ref={imagePanelRef} className={styles.imagePanel}>
          <div ref={imageLayerRef} className={styles.imageLayer}>
            <SafeImage
              src={image}
              fallbackSrc={imageFallback}
              alt={imageAlt}
              fill
              quality={90}
              sizes="(max-width: 767px) 100vw, 50vw"
              className={styles.image}
            />
          </div>
        </div>

        <div className={styles.tablePanel}>
          <div ref={tableHeaderRef} className={styles.tableHeader}>
            <span>Milestone</span>
            <span>%</span>
          </div>

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
