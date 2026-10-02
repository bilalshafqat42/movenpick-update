"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  CONSENT_OPEN_EVENT,
  OPTIONAL_CATEGORIES,
  hasDecided,
  hasDecidedOnServer,
  readConsent,
  subscribeToConsent,
  writeConsent,
} from "@/lib/cookieConsent";
import styles from "./CookieConsent.module.css";

/*
 * The consent banner.
 *
 * Deliberately NOT a modal. A dialog that traps focus and blocks the page
 * until it is answered is the pattern most likely to be dismissed without
 * being read, and it makes the first thing a visitor meets a demand
 * rather than the property. This sits at the bottom, leaves the page
 * usable, and waits.
 *
 * Reject is a real button beside Accept, not a link buried in
 * "preferences". Consent that is harder to refuse than to give is not
 * freely given, which is the standard UAE PDPL sets.
 *
 * Renders nothing at all until it has read storage on the client. The
 * stored decision is not available during a server render, so drawing the
 * banner in the initial HTML would flash it at every returning visitor
 * who had already answered — the one thing a consent banner must not do.
 */
export default function CookieConsentClient({
  title,
  body,
  acceptLabel,
  rejectLabel,
  manageLabel,
  saveLabel,
  categories,
  privacyLabel,
  privacyHref,
}) {
  /*
   * Read through useSyncExternalStore rather than copied into state in
   * an effect. localStorage is an external store, this is the API for
   * one, and it avoids the render-then-correct flash that setting state
   * from an effect produces.
   */
  const decided = useSyncExternalStore(
    subscribeToConsent,
    hasDecided,
    hasDecidedOnServer,
  );

  const [reopened, setReopened] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [choices, setChoices] = useState({
    analytics: false,
    marketing: false,
  });

  const panelRef = useRef(null);
  const headingId = useId();
  const bodyId = useId();

  const open = !decided || reopened;

  const close = useCallback(() => {
    setReopened(false);
    setShowChoices(false);
  }, []);

  const decide = useCallback(
    (next) => {
      writeConsent(next);
      setChoices(next);
      close();
    },
    [close],
  );

  /*
   * Loads whatever was stored before showing the toggles, so re-opening
   * from the footer shows the visitor's actual settings rather than
   * defaults they never chose.
   */
  const revealChoices = useCallback(() => {
    const stored = readConsent();

    if (stored) {
      setChoices({
        analytics: stored.analytics === true,
        marketing: stored.marketing === true,
      });
    }

    setShowChoices(true);
  }, []);

  useEffect(() => {
    const reopen = () => {
      revealChoices();
      setReopened(true);
    };

    window.addEventListener(CONSENT_OPEN_EVENT, reopen);

    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, [revealChoices]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    /*
     * Escape only closes a banner the visitor asked to see. Being asked
     * for the first time is a question that has not been answered yet —
     * dismissing it with a keystroke would leave no way back to it.
     */
    const onKeyDown = (event) => {
      if (event.key === "Escape" && reopened) {
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close, reopened]);

  /*
   * Focus moves into the panel when it opens, so a keyboard or screen
   * reader user is taken to the question rather than having to find it.
   * Focus is placed on the heading, not the first button, so the reason
   * for the interruption is read before the options.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector("[data-consent-heading]")?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) {
    return null;
  }

  const acceptAll = { analytics: true, marketing: true };
  const rejectAll = { analytics: false, marketing: false };

  return (
    <div
      ref={panelRef}
      className={styles.banner}
      role="region"
      aria-labelledby={headingId}
      aria-describedby={bodyId}
    >
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2
            id={headingId}
            className={styles.title}
            data-consent-heading
            tabIndex={-1}
          >
            {title}
          </h2>

          <p id={bodyId} className={styles.body}>
            {body}{" "}
            {privacyHref ? (
              <a className={styles.privacyLink} href={privacyHref}>
                {privacyLabel}
              </a>
            ) : null}
          </p>
        </div>

        {showChoices ? (
          <ul className={styles.categories}>
            {categories.map((category) => {
              const locked = category.key === "necessary";
              const checked = locked || choices[category.key] === true;

              return (
                <li key={category.key} className={styles.category}>
                  <label className={styles.categoryLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={checked}
                      disabled={locked}
                      onChange={(event) =>
                        setChoices((current) => ({
                          ...current,
                          [category.key]: event.target.checked,
                        }))
                      }
                    />

                    <span className={styles.categoryText}>
                      <span className={styles.categoryTitle}>
                        {category.title}
                        {locked ? (
                          <span className={styles.always}> — always on</span>
                        ) : null}
                      </span>

                      <span className={styles.categoryBody}>
                        {category.body}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className={styles.actions}>
          {showChoices ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => decide(choices)}
            >
              {saveLabel}
            </button>
          ) : (
            <button
              type="button"
              className={styles.secondary}
              onClick={revealChoices}
              aria-expanded={showChoices}
            >
              {manageLabel}
            </button>
          )}

          <button
            type="button"
            className={styles.secondary}
            onClick={() => decide(rejectAll)}
          >
            {rejectLabel}
          </button>

          <button
            type="button"
            className={styles.primary}
            onClick={() => decide(acceptAll)}
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export { OPTIONAL_CATEGORIES };
