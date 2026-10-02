"use client";

import Image from "next/image";
import { useRef } from "react";

import { trackEvent } from "@/lib/analytics";
import { gsap, useGSAP } from "@/lib/gsap";
import styles from "./Project.module.css";

const progressLabels = [
  "project-intro",
  "project-description",
  "project-location",
];

export default function ProjectClient({
  eyebrow,
  title,
  buttonLabel,
  brochureUrl,
  description,
  location,
  buildingImage,
  buildingImageAlt,
  landscapeImage,
  landscapeImageAlt,
  portraitImage,
  portraitImageAlt,
}) {
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);

  const imageSceneRef = useRef(null);
  const imageRef = useRef(null);
  const overlayRef = useRef(null);
  const introRef = useRef(null);
  const introContentRef = useRef(null);

  const beigeSceneRef = useRef(null);
  const descriptionOneRef = useRef(null);
  const descriptionTwoRef = useRef(null);

  /*
   * Desktop editorial image reveal elements.
   *
   * Landscape:
   * opens horizontally from left to right.
   *
   * Portrait:
   * opens vertically from top to bottom.
   */
  const landscapeImageRef = useRef(null);
  const portraitImageRef = useRef(null);

  const mobileSceneRef = useRef(null);
  const mobileImageRevealRef = useRef(null);
  const mobileImageRef = useRef(null);
  const mobileOverlayRef = useRef(null);
  const mobileStoryPanelRef = useRef(null);
  const mobileItemRefs = useRef([]);

  const progressRefs = useRef([]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const sticky = stickyRef.current;

      const imageScene = imageSceneRef.current;
      const image = imageRef.current;
      const overlay = overlayRef.current;
      const intro = introRef.current;
      const introContent = introContentRef.current;

      const beigeScene = beigeSceneRef.current;
      const descriptionOne = descriptionOneRef.current;
      const descriptionTwo = descriptionTwoRef.current;

      const landscapeImage = landscapeImageRef.current;
      const portraitImage = portraitImageRef.current;

      const mobileScene = mobileSceneRef.current;
      const mobileImageReveal = mobileImageRevealRef.current;
      const mobileImage = mobileImageRef.current;
      const mobileOverlay = mobileOverlayRef.current;
      const mobileStoryPanel = mobileStoryPanelRef.current;
      const mobileItems = mobileItemRefs.current.filter(Boolean);

      const progressLines = progressRefs.current.filter(Boolean);

      if (!section || !sticky) {
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
          const {
            desktop = false,
            mobile = false,
            reduceMotion = false,
          } = context.conditions ?? {};

          const setActiveProgress = (activeIndex) => {
            progressLines.forEach((line, index) => {
              if (!line) {
                return;
              }

              line.dataset.active = index === activeIndex ? "true" : "false";
            });
          };

          if (reduceMotion) {
            gsap.set(sticky, {
              clipPath: "none",
            });

            if (desktop) {
              const introChildren = introContent
                ? Array.from(introContent.children)
                : [];

              gsap.set(
                [
                  imageScene,
                  image,
                  overlay,
                  intro,
                  ...introChildren,
                  beigeScene,
                  descriptionOne,
                  descriptionTwo,
                  landscapeImage,
                  portraitImage,
                ].filter(Boolean),
                {
                  clearProps: "all",
                  autoAlpha: 1,
                  x: 0,
                  y: 0,
                  xPercent: 0,
                  yPercent: 0,
                  clipPath: "none",
                },
              );
            }

            if (mobile) {
              gsap.set(
                [
                  mobileScene,
                  mobileImageReveal,
                  mobileImage,
                  mobileOverlay,
                  mobileStoryPanel,
                  ...mobileItems,
                ].filter(Boolean),
                {
                  clearProps: "all",
                  autoAlpha: 1,
                  x: 0,
                  y: 0,
                  xPercent: 0,
                  yPercent: 0,
                  clipPath: "none",
                },
              );
            }

            progressLines.forEach((line) => {
              if (line) {
                line.dataset.active = "false";
              }
            });

            return undefined;
          }

          /* =====================================================
             DESKTOP
             ===================================================== */

          if (desktop) {
            if (
              !imageScene ||
              !image ||
              !overlay ||
              !intro ||
              !introContent ||
              !beigeScene ||
              !descriptionOne ||
              !descriptionTwo ||
              !landscapeImage ||
              !portraitImage
            ) {
              return undefined;
            }

            const introChildren = Array.from(introContent.children);

            gsap.set(sticky, {
              clipPath: "inset(100% 0% 0% 0%)",
            });

            gsap.set(imageScene, {
              yPercent: 0,
            });

            gsap.set(image, {
              scale: 1.06,
              yPercent: 5,
              transformOrigin: "center center",
            });

            gsap.set(overlay, {
              opacity: 0.42,
            });

            gsap.set(intro, {
              autoAlpha: 0,
              y: 76,
              pointerEvents: "none",
            });

            gsap.set(introChildren, {
              autoAlpha: 0,
              y: 28,
            });

            gsap.set(beigeScene, {
              yPercent: 100,
            });

            gsap.set([descriptionOne, descriptionTwo], {
              autoAlpha: 0,
              y: 58,
              pointerEvents: "none",
            });

            /*
             * First image begins completely hidden from
             * the right side, creating a left-to-right reveal.
             */
            gsap.set(landscapeImage, {
              clipPath: "inset(0% 100% 0% 0%)",
            });

            /*
             * Second image begins completely hidden from
             * the bottom, creating a top-to-bottom reveal.
             */
            gsap.set(portraitImage, {
              clipPath: "inset(100% 0% 0% 0%)",
            });

            setActiveProgress(0);

            const entranceTimeline = gsap.timeline({
              defaults: {
                ease: "none",
              },

              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "top top",
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            });

            entranceTimeline
              .to(
                sticky,
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
                  yPercent: 0,
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

            let activeProgressIndex = 0;

            const storyTimeline = gsap.timeline({
              defaults: {
                ease: "none",
              },

              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: "bottom bottom",

                scrub: 0.95,
                invalidateOnRefresh: true,

                snap: {
                  snapTo: "labelsDirectional",

                  duration: {
                    min: 0.35,
                    max: 0.9,
                  },

                  delay: 0.12,
                  ease: "power2.inOut",
                  inertia: false,
                },

                onUpdate: () => {
                  const currentTime = storyTimeline.time();

                  let nearestIndex = 0;
                  let nearestDistance = Number.POSITIVE_INFINITY;

                  progressLabels.forEach((label, index) => {
                    const labelTime = storyTimeline.labels[label];

                    if (typeof labelTime !== "number") {
                      return;
                    }

                    const distance = Math.abs(currentTime - labelTime);

                    if (distance < nearestDistance) {
                      nearestDistance = distance;
                      nearestIndex = index;
                    }
                  });

                  if (nearestIndex !== activeProgressIndex) {
                    activeProgressIndex = nearestIndex;

                    setActiveProgress(nearestIndex);
                  }
                },
              },
            });

            storyTimeline
              .to(intro, {
                autoAlpha: 1,
                y: 0,
                pointerEvents: "auto",
                duration: 0.5,
                ease: "power3.out",
              })
              .to(
                introChildren,
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.38,
                  stagger: 0.07,
                  ease: "power3.out",
                },
                "-=0.24",
              )
              .addLabel("project-intro")
              .to(
                {},
                {
                  duration: 0.66,
                },
              )

              /*
               * Move from the building scene into the
               * beige editorial scene.
               */
              .to(imageScene, {
                yPercent: -101,
                duration: 1.1,
                ease: "power2.inOut",
              })
              .to(
                beigeScene,
                {
                  yPercent: 0,
                  duration: 1.1,
                  ease: "power2.inOut",
                },
                "<",
              )

              /*
               * First editorial state.
               */
              .to(descriptionOne, {
                autoAlpha: 1,
                y: 0,
                pointerEvents: "auto",
                duration: 0.55,
                ease: "power3.out",
              })
              .to(
                landscapeImage,
                {
                  clipPath: "inset(0% 0% 0% 0%)",
                  duration: 0.78,
                  ease: "power3.inOut",
                },
                "<",
              )
              .addLabel("project-description")
              .to(
                {},
                {
                  duration: 0.82,
                },
              )

              /*
               * First editorial state exits.
               */
              .to(descriptionOne, {
                autoAlpha: 0,
                y: -52,
                pointerEvents: "none",
                duration: 0.48,
                ease: "power2.inOut",
              })
              .to(
                {},
                {
                  duration: 0.12,
                },
              )

              /*
               * Second editorial state.
               */
              .to(descriptionTwo, {
                autoAlpha: 1,
                y: 0,
                pointerEvents: "auto",
                duration: 0.55,
                ease: "power3.out",
              })
              .to(
                portraitImage,
                {
                  clipPath: "inset(0% 0% 0% 0%)",
                  duration: 0.82,
                  ease: "power3.inOut",
                },
                "<",
              )
              .addLabel("project-location")
              .to(
                {},
                {
                  duration: 0.95,
                },
              );

            return () => {
              entranceTimeline.kill();
              storyTimeline.kill();
            };
          }

          /* =====================================================
             MOBILE — unchanged
             ===================================================== */

          if (mobile) {
            if (
              !mobileScene ||
              !mobileImageReveal ||
              !mobileImage ||
              !mobileOverlay ||
              !mobileStoryPanel ||
              mobileItems.length !== 3
            ) {
              return undefined;
            }

            gsap.set(sticky, {
              clipPath: "none",
            });

            gsap.set(mobileScene, {
              autoAlpha: 1,
            });

            gsap.set(mobileImageReveal, {
              clipPath: "inset(0% 100% 0% 0%)",
            });

            gsap.set(mobileImage, {
              xPercent: -5,
              scale: 1.035,
              transformOrigin: "center center",
            });

            gsap.set(mobileOverlay, {
              opacity: 0.35,
            });

            gsap.set(mobileStoryPanel, {
              autoAlpha: 1,
            });

            mobileItems.forEach((item, index) => {
              gsap.set(item, {
                autoAlpha: index === 0 ? 1 : 0,
                y: index === 0 ? 0 : 42,
                pointerEvents: index === 0 ? "auto" : "none",
                force3D: true,
              });
            });

            const firstItemChildren = Array.from(mobileItems[0].children);

            gsap.set(firstItemChildren, {
              autoAlpha: 0,
              y: 26,
            });

            setActiveProgress(0);

            const mobileRevealTimeline = gsap.timeline({
              defaults: {
                ease: "none",
              },

              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "top top",
                scrub: 0.7,
                invalidateOnRefresh: true,
              },
            });

            mobileRevealTimeline
              .to(
                mobileImageReveal,
                {
                  clipPath: "inset(0% 0% 0% 0%)",
                  duration: 1,
                },
                0,
              )
              .to(
                mobileImage,
                {
                  xPercent: 0,
                  scale: 1,
                  duration: 1,
                },
                0,
              )
              .to(
                mobileOverlay,
                {
                  opacity: 1,
                  duration: 1,
                },
                0,
              );

            let activeProgressIndex = 0;

            const mobileStoryTimeline = gsap.timeline({
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: "bottom bottom",

                scrub: 0.75,
                invalidateOnRefresh: true,

                snap: {
                  snapTo: "labelsDirectional",

                  duration: {
                    min: 0.35,
                    max: 0.65,
                  },

                  delay: 0.18,
                  ease: "power2.inOut",
                  inertia: false,
                },

                onUpdate: () => {
                  const currentTime = mobileStoryTimeline.time();

                  let nearestIndex = 0;
                  let nearestDistance = Number.POSITIVE_INFINITY;

                  progressLabels.forEach((label, index) => {
                    const labelTime = mobileStoryTimeline.labels[label];

                    if (typeof labelTime !== "number") {
                      return;
                    }

                    const distance = Math.abs(currentTime - labelTime);

                    if (distance < nearestDistance) {
                      nearestDistance = distance;

                      nearestIndex = index;
                    }
                  });

                  if (nearestIndex !== activeProgressIndex) {
                    activeProgressIndex = nearestIndex;

                    setActiveProgress(nearestIndex);
                  }
                },
              },
            });

            mobileStoryTimeline
              .to(firstItemChildren, {
                autoAlpha: 1,
                y: 0,
                duration: 0.48,
                stagger: 0.1,
                ease: "power3.out",
              })
              .addLabel("project-intro")
              .to(
                {},
                {
                  duration: 0.68,
                },
              )
              .to(mobileItems[0], {
                autoAlpha: 0,
                y: -38,
                pointerEvents: "none",
                duration: 0.42,
                ease: "power2.inOut",
              })
              .fromTo(
                mobileItems[1],
                {
                  autoAlpha: 0,
                  y: 42,
                  pointerEvents: "none",
                },
                {
                  autoAlpha: 1,
                  y: 0,
                  pointerEvents: "auto",
                  duration: 0.58,
                  ease: "power3.out",
                },
              )
              .addLabel("project-description")
              .to(
                {},
                {
                  duration: 0.82,
                },
              )
              .to(mobileItems[1], {
                autoAlpha: 0,
                y: -38,
                pointerEvents: "none",
                duration: 0.42,
                ease: "power2.inOut",
              })
              .fromTo(
                mobileItems[2],
                {
                  autoAlpha: 0,
                  y: 42,
                  pointerEvents: "none",
                },
                {
                  autoAlpha: 1,
                  y: 0,
                  pointerEvents: "auto",
                  duration: 0.58,
                  ease: "power3.out",
                },
              )
              .addLabel("project-location")
              .to(
                {},
                {
                  duration: 0.9,
                },
              );

            return () => {
              mobileRevealTimeline.kill();
              mobileStoryTimeline.kill();
            };
          }

          return undefined;
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
      id="project"
      className={styles.project}
      aria-labelledby="project-section-title"
    >
      <div ref={stickyRef} className={styles.stickyViewport}>
        <h2 id="project-section-title" className={styles.visuallyHidden}>
          Movenpick project
        </h2>

        <div ref={imageSceneRef} className={styles.imageScene}>
          <div className={styles.background}>
            <Image
              ref={imageRef}
              src={buildingImage}
              alt={buildingImageAlt}
              fill
              quality={90}
              sizes="100vw"
              className={styles.backgroundImage}
            />

            <div
              ref={overlayRef}
              className={styles.backgroundOverlay}
              aria-hidden="true"
            />
          </div>

          <article
            ref={introRef}
            className={styles.introCard}
            aria-labelledby="project-intro-heading"
          >
            <div ref={introContentRef} className={styles.introContent}>
              <div>
                <p className={styles.eyebrow}>{eyebrow}</p>

                <h3 id="project-intro-heading" className={styles.title}>
                  {title}
                </h3>
              </div>

              <a
                href={brochureUrl}
                download="movenpick-brochure.pdf"
                className={styles.requestLink}
                onClick={() =>
                  trackEvent("brochure_download", { location: "project_intro" })
                }
              >
                {buttonLabel}

                <span className={styles.brochureIcon} aria-hidden="true" />
              </a>
            </div>
          </article>
        </div>

        <div ref={beigeSceneRef} className={styles.beigeScene}>
          <article
            ref={descriptionOneRef}
            className={`${styles.descriptionBlock} ${styles.descriptionRight}`}
          >
            <div className={styles.editorialImageLandscapeCell}>
              <div
                ref={landscapeImageRef}
                className={`${styles.editorialImage} ${styles.editorialImageLandscape}`}
              >
                <Image
                  src={landscapeImage}
                  alt={landscapeImageAlt}
                  fill
                  quality={90}
                  sizes="50vw"
                  className={styles.editorialImageMedia}
                />
              </div>
            </div>

            <div className={styles.editorialText}>
              <p>{description}</p>
            </div>
          </article>

          <article
            ref={descriptionTwoRef}
            className={`${styles.descriptionBlock} ${styles.descriptionLeft}`}
          >
            <div className={styles.editorialText}>
              <p>{location}</p>
            </div>

            <div
              ref={portraitImageRef}
              className={`${styles.editorialImage} ${styles.editorialImagePortrait}`}
            >
              <Image
                src={portraitImage}
                alt={portraitImageAlt}
                fill
                quality={90}
                sizes="40vw"
                className={styles.editorialImageMedia}
              />
            </div>
          </article>
        </div>

        <div ref={mobileSceneRef} className={styles.mobileScene}>
          <div ref={mobileImageRevealRef} className={styles.mobileImageReveal}>
            <Image
              ref={mobileImageRef}
              src={buildingImage}
              alt={buildingImageAlt}
              fill
              quality={90}
              sizes="100vw"
              className={styles.mobileImage}
            />

            <div
              ref={mobileOverlayRef}
              className={styles.mobileImageOverlay}
              aria-hidden="true"
            />
          </div>

          <div ref={mobileStoryPanelRef} className={styles.mobileStoryPanel}>
            <div className={styles.mobileStoryItems}>
              <article
                ref={(element) => {
                  mobileItemRefs.current[0] = element;
                }}
                className={styles.mobileStoryItem}
              >
                <p className={styles.mobileEyebrow}>{eyebrow}</p>

                <h3 className={styles.mobileTitle}>{title}</h3>

                <a
                  href={brochureUrl}
                  download="movenpick-brochure.pdf"
                  className={styles.mobileBrochureLink}
                  onClick={() =>
                    trackEvent("brochure_download", { location: "project_intro_mobile" })
                  }
                >
                  {buttonLabel}

                  <span className={styles.brochureIcon} aria-hidden="true" />
                </a>
              </article>

              <article
                ref={(element) => {
                  mobileItemRefs.current[1] = element;
                }}
                className={styles.mobileStoryItem}
              >
                <p className={styles.mobileDescription}>{description}</p>
              </article>

              <article
                ref={(element) => {
                  mobileItemRefs.current[2] = element;
                }}
                className={styles.mobileStoryItem}
              >
                <p className={styles.mobileDescription}>{location}</p>
              </article>
            </div>
          </div>
        </div>

        <div className={styles.progress} aria-hidden="true">
          {progressLabels.map((label, index) => (
            <span
              key={label}
              ref={(element) => {
                progressRefs.current[index] = element;
              }}
              className={styles.progressLine}
              data-active={index === 0 ? "true" : "false"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
