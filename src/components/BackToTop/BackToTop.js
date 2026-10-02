"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import styles from "./BackToTop.module.css";

const SHOW_AFTER = 600;

/*
 * Hover growth is 10%.
 *
 * It is applied by scaling the icon UP to 1 rather than past it: the
 * .icon box is rendered 110% of the button in CSS and held at
 * 1 / 1.1 at rest, so the SVG is always rasterised at its largest
 * on-screen size and hover only ever removes a down-scale. Growing
 * past 1 instead would stretch a raster captured at the smaller size
 * and the arrow would go soft on the way up.
 */
const ICON_GROWTH = 1.1;
const ICON_REST_SCALE = 1 / ICON_GROWTH;
const ICON_HOVER_SCALE = 1;

export default function BackToTop() {
  const buttonRef = useRef(null);
  const iconRef = useRef(null);

  const [isVisible, setIsVisible] = useState(false);

  /*
   * Show the button only after the visitor
   * has moved away from the Hero section.
   */
  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > SHOW_AFTER;

      setIsVisible((currentValue) =>
        currentValue === shouldShow ? currentValue : shouldShow,
      );
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /*
   * Button visibility animation.
   */
  useGSAP(
    () => {
      const button = buttonRef.current;
      const icon = iconRef.current;

      if (!button || !icon) {
        return undefined;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.killTweensOf([button, icon]);

      gsap.set(icon, {
        scale: ICON_REST_SCALE,
      });

      if (reduceMotion) {
        gsap.set(button, {
          autoAlpha: isVisible ? 1 : 0,
          y: 0,
          scale: 1,
          pointerEvents: isVisible ? "auto" : "none",
        });

        gsap.set(icon, {
          y: 0,
        });

        return undefined;
      }

      if (isVisible) {
        const timeline = gsap.timeline();

        timeline
          .to(button, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.48,
            ease: "back.out(1.35)",
            pointerEvents: "auto",
            overwrite: true,
          })
          .fromTo(
            icon,
            {
              y: 3,
            },
            {
              y: 0,
              duration: 0.4,
              ease: "power3.out",
              overwrite: true,
            },
            "-=0.25",
          );

        return () => {
          timeline.kill();
        };
      }

      gsap.to(button, {
        autoAlpha: 0,
        y: 14,
        scale: 0.92,
        duration: 0.3,
        ease: "power2.in",
        pointerEvents: "none",
        overwrite: true,
      });

      return undefined;
    },
    {
      dependencies: [isVisible],
      scope: buttonRef,
    },
  );

  /*
   * Premium hover movement.
   *
   * The light/dark SVG swap is handled by CSS,
   * while GSAP controls only the physical movement.
   */
  const handleMouseEnter = useCallback(() => {
    const button = buttonRef.current;
    const icon = iconRef.current;

    if (!button || !icon) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      return;
    }

    gsap.to(button, {
      y: -4,
      duration: 0.35,
      ease: "power3.out",
      overwrite: true,
    });

    gsap.to(icon, {
      y: -3,
      scale: ICON_HOVER_SCALE,
      duration: 0.35,
      ease: "power3.out",
      overwrite: true,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const button = buttonRef.current;
    const icon = iconRef.current;

    if (!button || !icon) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      return;
    }

    gsap.to(button, {
      y: 0,
      scale: 1,
      duration: 0.4,
      ease: "power3.out",
      overwrite: true,
    });

    gsap.to(icon, {
      y: 0,
      scale: ICON_REST_SCALE,
      duration: 0.4,
      ease: "power3.out",
      overwrite: true,
    });
  }, []);

  const handleBackToTop = useCallback(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.backToTop}
      aria-label="Back to top"
      title="Back to top"
      onClick={handleBackToTop}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className={styles.label} aria-hidden="true">
        Back to Top
      </span>

      <span ref={iconRef} className={styles.icon} aria-hidden="true">
        <span className={styles.lightIcon} />
        <span className={styles.darkIcon} />
      </span>
    </button>
  );
}
