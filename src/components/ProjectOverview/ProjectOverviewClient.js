"use client";

import { useRef } from "react";

import { trackEvent } from "@/lib/analytics";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { revealOnArrival } from "@/lib/revealOnArrival";
import {
  ENTRANCE_DURATION,
  ENTRANCE_EASE,
  ENTRANCE_START,
  HERO_COPY_STAGGER,
} from "@/lib/motion";
import styles from "./ProjectOverview.module.css";

export default function ProjectOverviewClient({
  description,
  stats,
  cta1Label,
  cta1Href,
  cta2Label,
  cta2Href,
}) {
  const sectionRef = useRef(null);
  const descriptionRef = useRef(null);
  const descriptionWordRefs = useRef([]);
  const dividerRef = useRef(null);
  const statsRef = useRef(null);
  const ctaRowRef = useRef(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const descriptionEl = descriptionRef.current;
      const divider = dividerRef.current;
      const statItems = statsRef.current
        ? Array.from(statsRef.current.querySelectorAll(`.${styles.stat}`))
        : [];
      const ctaRow = ctaRowRef.current;

      if (!section || !descriptionEl || !divider || !ctaRow) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      /*
       * The heading sits at 60% gold (see .description in the module
       * CSS) and its opening sentence is brought up to full strength
       * one word at a time, left to right, as it arrives — the sentence
       * lighting up in the order it is read, with the rest of the
       * paragraph left soft behind it.
       *
       * The destination is read from --color-gold rather than written
       * out here, so this cannot drift from the brand token.
       */
      const descriptionWords = descriptionWordRefs.current.filter(Boolean);

      const fullStrengthGold =
        window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--color-gold")
          .trim() || "#897655";

      /*
       * Which words light up: on desktop, everything through the first
       * full stop; below that, the whole paragraph.
       *
       * Found by looking for the stop rather than by counting words, so
       * rewriting the copy moves the boundary with it instead of
       * leaving a hard-coded index pointing into the middle of a
       * sentence. If the text has no full stop at all the search
       * returns -1 and the whole paragraph lights, which is the sensible
       * reading of "up to the first sentence" when there is only one.
       */
      const litWords = () => {
        if (!window.matchMedia("(min-width: 1025px)").matches) {
          return descriptionWords;
        }

        const firstStop = descriptionWords.findIndex((word) =>
          word.textContent.includes("."),
        );

        return firstStop === -1
          ? descriptionWords
          : descriptionWords.slice(0, firstStop + 1);
      };

      if (reduceMotion) {
        gsap.set([descriptionEl, divider, ...statItems, ctaRow], {
          autoAlpha: 1,
          y: 0,
        });

        gsap.set(litWords(), { color: fullStrengthGold });

        return;
      }

      gsap.set([descriptionEl, divider, ...statItems, ctaRow], {
        autoAlpha: 0,
        y: 24,
      });

      revealOnArrival({
        trigger: section,
        start: ENTRANCE_START,

        onReveal: () => {
          /*
           * The same gap the hero's opening uses, so the two sections
           * introduce themselves at one pace rather than this one
           * running half again as fast.
           */
          const step = HERO_COPY_STAGGER;

          const timeline = gsap.timeline({ defaults: { ease: ENTRANCE_EASE } });

          timeline
            .to(descriptionEl, {
              autoAlpha: 1,
              y: 0,
              duration: ENTRANCE_DURATION,
            })
            .to(
              /*
               * Resolved here rather than at setup, so the width when
               * the animation actually runs is what decides, not the
               * width the page happened to load at.
               */
              litWords(),
              {
                color: fullStrengthGold,
                duration: 0.5,

                /*
                 * Linear, because this is a sweep across a sentence
                 * rather than a single object arriving. An ease would
                 * make the light rush the opening words and dawdle over
                 * the closing ones.
                 */
                ease: "none",

                /*
                 * `amount`, not `each`: the sweep takes 1.2 seconds to
                 * cross the sentence however many words the sentence
                 * happens to have. With a per-word figure, rewriting
                 * the copy — or the desktop/mobile difference in how
                 * many words are lit — would change how long this
                 * takes.
                 */
                stagger: { amount: 1.2, from: "start" },
              },
              /*
               * Overlapped with the paragraph's own entrance rather
               * than queued behind it, so the text lights up as it
               * settles instead of arriving and then waiting to be lit.
               */
              step,
            )
            .to(
              divider,
              { autoAlpha: 1, y: 0, duration: ENTRANCE_DURATION },
              step,
            )
            /*
             * The four figures arrive one at a time — Q4 2028, then
             * 40/60, then the unit types, then the price — rather than
             * as a block, on the same spacing the hero uses.
             */
            .to(
              statItems,
              {
                autoAlpha: 1,
                y: 0,
                duration: ENTRANCE_DURATION,
                stagger: step,
              },
              step * 2,
            )
            /*
             * One step after the last figure, whatever the figure count
             * happens to be.
             *
             * The figures start at step * 2 and each is one step apart,
             * so the last of four lands at step * 5 — two more than the
             * count, not three. Written as `count + 1` the first time,
             * which put the buttons 450ms behind instead of 225.
             */
            .to(
              ctaRow,
              { autoAlpha: 1, y: 0, duration: ENTRANCE_DURATION },
              step * (statItems.length + 2),
            );
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="project-overview"
      className={styles.projectOverview}
      aria-labelledby="project-overview-description"
    >
      {/*
       * Split on whitespace and kept as separate tokens, so the runs of
       * space are rendered back exactly as they were written rather
       * than normalised to one space each. The words are spans only so
       * the sweep below has something to brighten one at a time; the
       * heading still reads as one continuous string.
       */}
      <h2
        ref={descriptionRef}
        id="project-overview-description"
        className={styles.description}
      >
        {description.split(/(\s+)/).map((token, index) =>
          /\s/.test(token) ? (
            token
          ) : (
            <span
              key={index}
              ref={(element) => {
                descriptionWordRefs.current[index] = element;
              }}
              className={styles.descriptionWord}
            >
              {token}
            </span>
          ),
        )}
      </h2>

      <hr ref={dividerRef} className={styles.divider} />

      <div ref={statsRef} className={styles.stats}>
        {stats.map((stat, index) => (
          <div className={styles.stat} key={index}>
            <p className={styles.statValue}>{stat.value}</p>
            <p className={styles.statLabel}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div ref={ctaRowRef} className={styles.ctaRow}>
        <a
          href={cta1Href}
          className={styles.ctaButton}
          {...(cta1Href === "#contact" ? { "data-contact-popup": true } : {})}
        >
          <span>{cta1Label}</span>
          <span className={styles.ctaIcon} aria-hidden="true">
            →
          </span>
        </a>

        <a
          href={cta2Href}
          download="movenpick-brochure.pdf"
          className={styles.ctaButton}
          onClick={() =>
            trackEvent("brochure_download", { location: "project_overview" })
          }
        >
          <span>{cta2Label}</span>
          <span className={styles.downloadIcon} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
