"use client";

import Image from "next/image";
import { useRef } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { revealOnArrival } from "@/lib/revealOnArrival";
import {
  ENTRANCE_DURATION,
  ENTRANCE_EASE,
  ENTRANCE_RISE,
  ENTRANCE_STAGGER,
  ENTRANCE_START,
} from "@/lib/motion";
import styles from "./TrustedPartner.module.css";

/*
 * Viewport heights of scrolling the card's expansion plays across.
 *
 * It used to be tied to the media block's own geometry, which worked out
 * to roughly 320px of scroll — two or three wheel notches to take the
 * card from a small panel to covering the whole photograph. A takeover
 * that large needs to be watchable, not glimpsed, so the distance is
 * now stated outright in terms of the viewport rather than falling out
 * of a chain of relative anchors.
 */
const GROW_VIEWPORTS = 0.9;

/*
 * Viewport heights the photograph is held, centred and untouched,
 * before the card starts taking it over.
 *
 * Same reasoning as the Project Gallery's arrival hold: without it the
 * takeover begins on the very pixel the photo settles into place, so
 * arriving and being covered are one motion and the photograph is never
 * seen on its own.
 */
const GROW_ARRIVAL_VIEWPORTS = 0.2;

export default function TrustedPartnerClient({
  logo,
  logoAlt,
  label,
  heading,
  text,
  image,
  imageAlt,
  cardHeading,
  cardText,
  ctaLabel,
  ctaHref,
}) {
  const sectionRef = useRef(null);
  const logoRef = useRef(null);
  const labelRef = useRef(null);
  const headingRef = useRef(null);
  const textRef = useRef(null);
  const mediaScrollRef = useRef(null);
  const mediaRef = useRef(null);
  const cardRef = useRef(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const mediaScroll = mediaScrollRef.current;
      const media = mediaRef.current;
      const card = cardRef.current;

      /*
       * The partner's logo is the point of this section, so it lands on
       * its own and is given a moment before the copy starts arriving
       * under it — see the doubled gap where these are animated.
       */
      const logo = logoRef.current;

      const copyReveal = [
        labelRef.current,
        headingRef.current,
        textRef.current,
      ].filter(Boolean);

      const textReveal = [logo, ...copyReveal].filter(Boolean);

      if (!section) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion) {
        const cardContents = card
          ? [
              card.querySelector(`.${styles.cardHeading}`),
              card.querySelector(`.${styles.cardText}`),
              card.querySelector(`.${styles.ctaButton}`),
            ].filter(Boolean)
          : [];

        gsap.set(
          [...textReveal, ...cardContents, media, card].filter(Boolean),
          {
            autoAlpha: 1,
            y: 0,
          },
        );

        return;
      }

      gsap.set(textReveal, { autoAlpha: 0, y: ENTRANCE_RISE });

      /*
       * Triggered on the LOGO, not on the section.
       *
       * ENTRANCE_START is "top 50%", which everywhere else on the page
       * means "the section is half on screen" and "its content is on
       * screen" at the same moment — those sections are about one
       * screen tall. This one is three, and its opening screen centres
       * the logo inside it, so the two moments are nowhere near each
       * other. Measured against the section: the entrance fired with
       * the logo box at y 778..928 of a 900px screen, its top edge
       * barely showing at the very bottom. It had finished long before
       * anyone scrolled far enough to look at it, which is exactly the
       * "it animates before I get there" report.
       *
       * Anchored to the logo, the same "top 50%" means the logo itself
       * is halfway up the screen — where the eye already is. It also
       * stays correct if the section's height or the logo's position
       * inside it ever changes, which an offset measured from the
       * section's top edge would not.
       */
      const textTrigger = revealOnArrival({
        trigger: logo ?? section,
        start: ENTRANCE_START,

        onReveal: () => {
          if (logo) {
            gsap.to(logo, {
              autoAlpha: 1,
              y: 0,
              duration: ENTRANCE_DURATION,
              ease: ENTRANCE_EASE,
            });
          }

          /*
           * The copy starts as the logo lands, not part-way through it.
           *
           * Written as the logo's own duration rather than as a
           * multiple of the stagger, because that is the thing it is
           * actually waiting for: the partner's mark gets the screen to
           * itself for its whole entrance and is read as the subject,
           * rather than as the first line of the block. The copy then
           * staggers among itself at the site's normal rhythm.
           */
          gsap.to(copyReveal, {
            autoAlpha: 1,
            y: 0,
            duration: ENTRANCE_DURATION,
            stagger: ENTRANCE_STAGGER,
            ease: ENTRANCE_EASE,
            delay: logo ? ENTRANCE_DURATION : 0,
          });
        },
      });

      let mediaTrigger;
      let growTrigger;

      /*
       * A separate trigger for the photo/card, since it sits further down
       * this (tall) section and would often still be off-screen when the
       * text block above enters — each reveals on its own arrival instead
       * of both firing together based on the section's top edge.
       */
      /*
       * The takeover runs wherever the CSS actually holds the photo
       * still, which is what the card needs to grow inside.
       *
       * Asking the element whether it is sticky, rather than repeating
       * a breakpoint here, means the two can never disagree: desktop
       * and mobile each give .mediaBlock a sticky frame and a runway
       * (see the module CSS), while the tablet tier in between leaves
       * it in normal flow and simply shows the card over the photo.
       */
      const heldStill = window.getComputedStyle(media).position === "sticky";

      if (media && card && mediaScroll && heldStill) {
        /*
         * The card's own contents arrive one at a time — heading, then
         * paragraph, then button — on the same rhythm as the Accor
         * block above it, so the two halves of the section introduce
         * themselves the same way.
         */
        const cardReveal = [
          card.querySelector(`.${styles.cardHeading}`),
          card.querySelector(`.${styles.cardText}`),
          card.querySelector(`.${styles.ctaButton}`),
        ].filter(Boolean);

        /*
         * The photograph is NOT hidden and faded in. Sliding up over
         * the held gold panel is its entrance (see .textBlock in the
         * desktop and mobile blocks of the stylesheet), and a fade on
         * top of that fought it: measured, the photo stayed at
         * visibility: hidden for the whole slide — its box travelled
         * from y 928 up to y 478 of a 900px screen with nothing in it —
         * and then appeared at once, halfway up. Gold, gold, gold, then
         * a photograph. That is the "it suddenly appears" report.
         *
         * Nothing hides it in CSS either, so leaving it alone means it
         * is simply there, and the travel is the whole animation. The
         * same is true of the gallery riding over the amenities, which
         * is the transition this is being matched to.
         */
        gsap.set(card, { autoAlpha: 0, y: 24 });
        gsap.set(cardReveal, { autoAlpha: 0, y: ENTRANCE_RISE });

        /*
         * Triggered on the CARD, not on the photograph around it.
         *
         * The photograph spends most of its travel crossing the screen,
         * so "the photo is half on screen" lands while it is still
         * moving and the card would arrive mid-slide. The card's own
         * position puts it at roughly the point the photo settles, so
         * the section reads as two beats: the photograph travels up
         * over the gold, then the card arrives inside it.
         */
        mediaTrigger = revealOnArrival({
          trigger: card,
          start: ENTRANCE_START,

          onReveal: () => {
            gsap
              .timeline({ defaults: { ease: ENTRANCE_EASE } })
              .to(card, { autoAlpha: 1, y: 0, duration: ENTRANCE_DURATION })
              /*
               * Starts as the card itself lands rather than after it,
               * so the panel and the first line of copy feel like one
               * arrival instead of two queued events.
               */
              .to(
                cardReveal,
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: ENTRANCE_DURATION,
                  stagger: ENTRANCE_STAGGER,
                },
                ENTRANCE_STAGGER,
              );
          },
        });

        /*
         * Scrolling on from the settled reveal grows the card from a
         * small centred panel into a full-bleed one covering the whole
         * photograph.
         *
         * Pinning all four edges (top/right/bottom/left) as an inset
         * from the media block's own edges, then animating all four
         * straight to 0, is what actually guarantees growth on every
         * side at once: each edge moves independently and by an equal
         * amount, with no dependency on a width/height that's changing
         * at the same time. The previous version instead centred the
         * card with top/left:50% plus a -50% transform and animated
         * only width/height — that trick keeps a *fixed*-size box
         * centred, but once the box's own size is what's changing, the
         * -50% shift (relative to the box's current, moving size) no
         * longer traces a straight line to the edges, so growth looked
         * uneven rather than expanding equally on every side.
         */

        /*
         * The card's natural size, measured with the four animated
         * edges neutralised so the element falls back to the size its
         * CSS gives it. Without clearing them first there is nothing to
         * measure: after the first frame the card's size IS the inset,
         * so reading it back would just return whatever the animation
         * last set.
         *
         * This is why the insets are recomputed rather than captured
         * once. Measuring a single time at setup baked pixel values
         * from one viewport into the tween, and `invalidateOnRefresh`
         * does not help — it re-derives the trigger's start and end but
         * not a tween's hard-coded endpoints. Resizing from 1440x900 to
         * 1100x800 left the old insets applied to a smaller block and
         * collapsed the card to a 109x349 slither inside a 1085x605
         * photo.
         */
        const measureInsets = () => {
          /*
           * `width` and `height` are cleared alongside the four edges.
           *
           * The grow sets both to `auto` so the insets can define the
           * box, and that inline `auto` survived into this measurement —
           * so the card shrink-wrapped its text and the CSS width was
           * never what got measured. Setting a width in the stylesheet
           * had no visible effect at all: measured 518px against a rule
           * asking for less. Clearing them here means the rule decides
           * the resting size, which is the only place it can be
           * expressed once and read by everything.
           */
          const edges = ["top", "right", "bottom", "left", "width", "height"];
          const saved = edges.map((edge) => card.style[edge]);

          edges.forEach((edge) => {
            card.style[edge] = "";
          });

          const cardRect = card.getBoundingClientRect();
          const mediaRect = media.getBoundingClientRect();

          /*
           * The width the copy wraps at, published while the card is at
           * its resting size — the only moment it can be read.
           *
           * The card grows to fill the whole panel, and without this the
           * heading and paragraph grew with it and re-wrapped: the same
           * words in a completely different shape by the time the
           * takeover finished. Freezing the wrap width keeps the copy
           * looking exactly as it does at rest while the background
           * expands behind it.
           */
          const cardStyle = window.getComputedStyle(card);

          const restingContentWidth =
            cardRect.width -
            (parseFloat(cardStyle.paddingLeft) || 0) -
            (parseFloat(cardStyle.paddingRight) || 0);

          card.style.setProperty(
            "--tp-card-content-width",
            `${Math.round(restingContentWidth)}px`,
          );

          edges.forEach((edge, index) => {
            card.style[edge] = saved[index];
          });

          return {
            x: Math.max(0, (mediaRect.width - cardRect.width) / 2),
            y: Math.max(0, (mediaRect.height - cardRect.height) / 2),
          };
        };

        let insets = measureInsets();

        gsap.set(card, {
          xPercent: 0,
          yPercent: 0,
          width: "auto",
          height: "auto",
        });

        growTrigger = ScrollTrigger.create({
          /*
           * Anchored to the media block sitting centred in the
           * viewport, which is both where the pin freezes it and a
           * point the entrance reveal above has comfortably finished
           * by. The old anchor was the card's own bottom edge reaching
           * the viewport bottom, which is a moving target: the card's
           * height depends on its text, so the expansion started at a
           * different moment on every breakpoint.
           */
          /*
           * Anchored to the photo sitting centred in the viewport,
           * which is exactly where the sticky CSS parks it and a point
           * the entrance reveal above has comfortably finished by. The
           * old anchor was the card's own bottom edge reaching the
           * viewport bottom, which is a moving target: the card's
           * height depends on its text, so the expansion started at a
           * different moment on every breakpoint.
           *
           * The offset on the start is the arrival hold — the stretch
           * where the photo is stuck, centred, and nothing is growing
           * over it yet.
           */
          trigger: media,
          start: () =>
            `center center-=${window.innerHeight * GROW_ARRIVAL_VIEWPORTS}`,
          end: () =>
            `center center-=${
              window.innerHeight * (GROW_ARRIVAL_VIEWPORTS + GROW_VIEWPORTS)
            }`,
          /*
           * Pins the media block on screen for exactly this scroll
           * range. Without it, the card was only ever centred
           * relative to the media block — and since the media block
           * itself keeps scrolling up the page as the card grows, it
           * only looked centred on screen at one particular scroll
           * position; everywhere else in the range, the media block
           * (and the card centred in it) sat off-centre in the
           * viewport. Freezing the media block in place for the
           * duration of the grow keeps it — and the card growing
           * inside it — genuinely centred on screen throughout.
           */
          /*
           * No `pin`. The photo is held by position: sticky in the CSS
           * instead, the same pattern Amenities and Project Gallery
           * use.
           *
           * GSAP's pin wraps the element in a pin-spacer, and this
           * section carries one of the page's scroll-snap points (see
           * globals.css). The browser trying to snap to a box whose
           * geometry the pin is rewriting fought the scroll hard:
           * 7,200px of wheel input moved the page only about 1,570px,
           * so the section felt heavy and reluctant. Sticky changes no
           * boxes and the resistance goes away entirely.
           */
          scrub: 0.6,
          invalidateOnRefresh: true,

          /*
           * Re-measure before every refresh, so a resize or an
           * orientation change rebuilds the expansion against the
           * block's new size instead of the one it was born in.
           */
          onRefreshInit: () => {
            insets = measureInsets();
          },

          animation: gsap.fromTo(
            card,
            {
              top: () => insets.y,
              right: () => insets.x,
              bottom: () => insets.y,
              left: () => insets.x,
            },
            {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              ease: "none",
            },
          ),
        });
      }

      return () => {
        textTrigger.kill();
        mediaTrigger?.kill();
        growTrigger?.kill();
      };
    },
    { scope: sectionRef },
  );

  const isExternalCta = /^https?:\/\//.test(ctaHref ?? "");

  return (
    <section
      ref={sectionRef}
      id="trusted-partner"
      className={styles.trustedPartner}
      aria-labelledby="trusted-partner-heading"
    >
      <div className={styles.textBlock}>
        <div ref={logoRef} className={styles.logoWrapper}>
          <Image
            src={logo}
            alt={logoAlt}
            width={96}
            height={96}
            className={styles.logo}
          />
        </div>

        <p ref={labelRef} className={styles.label}>
          {label}
        </p>

        <h2
          ref={headingRef}
          id="trusted-partner-heading"
          className={styles.heading}
        >
          {heading}
        </h2>

        <p ref={textRef} className={styles.text}>
          {text}
        </p>
      </div>

      <div
        ref={mediaScrollRef}
        className={styles.mediaScroll}
        style={{
          "--tp-runway": GROW_ARRIVAL_VIEWPORTS + GROW_VIEWPORTS,
        }}
      >
        <div ref={mediaRef} className={styles.mediaBlock}>
          <Image
            src={image}
            alt={imageAlt}
            fill
            quality={85}
            sizes="100vw"
            className={styles.mediaImage}
          />

          <div ref={cardRef} className={styles.card}>
            <h3 className={styles.cardHeading}>{cardHeading}</h3>

            <p className={styles.cardText}>{cardText}</p>

            <a
              href={ctaHref}
              className={styles.ctaButton}
              {...(isExternalCta
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <span>{ctaLabel}</span>
              <span className={styles.ctaIcon} aria-hidden="true">
                →
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
