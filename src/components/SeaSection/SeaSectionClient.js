"use client";

import SafeImage from "@/components/SafeImage";
import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import styles from "./SeaSection.module.css";

export default function SeaSectionClient({ image, imageAlt, imageFallback }) {
  const sectionRef = useRef(null);
  const panelRef = useRef(null);
  const imageRef = useRef(null);
  const overlayRef = useRef(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const panel = panelRef.current;
      const image = imageRef.current;
      const overlay = overlayRef.current;

      if (!section || !panel || !image || !overlay) {
        return undefined;
      }

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
            gsap.set(panel, {
              clipPath: "none",
            });

            gsap.set([image, overlay], {
              clearProps: "all",
            });

            return undefined;
          }

          /*
           * Hidden from the right.
           * GSAP reveals it from left to right,
           * like the curtain reveal used elsewhere on the page.
           */
          gsap.set(panel, {
            clipPath: "inset(0% 100% 0% 0%)",
          });

          /*
           * The image itself stays in position.
           * A very subtle horizontal offset settles during
           * reveal, matching the left-to-right opening.
           */
          gsap.set(image, {
            scale: mobile ? 1.035 : 1.05,
            xPercent: mobile ? -4 : -6,
            transformOrigin: "center center",
          });

          gsap.set(overlay, {
            opacity: 0.35,
          });

          const timeline = gsap.timeline({
            defaults: {
              ease: "none",
            },

            scrollTrigger: {
              trigger: section,

              /*
               * Start as the section enters the viewport.
               */
              start: "top bottom",

              /*
               * Finish when the section reaches the top.
               */
              end: "top top",

              scrub: mobile ? 0.55 : 0.8,
              invalidateOnRefresh: true,

              // markers: true,
            },
          });

          timeline
            /*
             * Image opens rightward, left to right.
             */
            .to(
              panel,
              {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 1,
              },
              0,
            )

            .to(
              image,
              {
                scale: 1,
                xPercent: 0,
                duration: 1,
              },
              0,
            )

            .to(
              overlay,
              {
                opacity: 1,
                duration: 1,
              },
              0,
            );

          return () => {
            timeline.kill();
          };
        },
      );

      return () => {
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
      className={styles.seaSection}
      aria-label="Coastal lifestyle imagery"
    >
      <div className={styles.stickyViewport}>
        <div ref={panelRef} className={styles.panel}>
          <div ref={imageRef} className={styles.imageCanvas}>
            <SafeImage
              src={image}
              fallbackSrc={imageFallback}
              alt={imageAlt}
              fill
              quality={90}
              sizes="100vw"
              className={styles.image}
            />
          </div>
        </div>

        <div ref={overlayRef} className={styles.overlay} aria-hidden="true" />
      </div>
    </section>
  );
}
