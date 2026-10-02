"use client";

/*
 * Cookie consent: the stored decision, and the one way to read or change
 * it.
 *
 * The site sets no analytics or marketing cookies today. That is exactly
 * why this exists now rather than later: the banner is the gate anything
 * added afterwards has to pass through, so the first script someone adds
 * cannot quietly run before a visitor has agreed to it. Add the script
 * behind `hasConsent("analytics")` and it inherits the whole flow.
 *
 * UAE PDPL treats consent as something given, not assumed, so:
 *
 * - Nothing beyond `necessary` is on until the visitor turns it on.
 *   Rejecting is one click, the same weight as accepting.
 * - The decision is stored, so it is not asked again on every visit.
 * - It can be withdrawn at any time, from the footer.
 *
 * Stored in localStorage rather than in a cookie: a cookie would be sent
 * on every request to a server that has no use for it, and — with some
 * irony — storing the consent record in a cookie is the kind of thing
 * consent is meant to cover. localStorage is same-origin, never
 * transmitted, and readable synchronously before first paint.
 */

const STORAGE_KEY = "movenpick-cookie-consent";

/*
 * Bumped when the categories change meaning. A stored decision from an
 * older version is treated as no decision, so the visitor is asked again
 * rather than having an old answer applied to a new question.
 */
const VERSION = 1;

export const CONSENT_EVENT = "movenpick:cookie-consent";
export const CONSENT_OPEN_EVENT = "movenpick:cookie-consent-open";

/*
 * `necessary` is not a choice and is never stored as one. It covers what
 * the site cannot work without and sets nothing that tracks anyone.
 */
export const OPTIONAL_CATEGORIES = ["analytics", "marketing"];

const DENY_ALL = { analytics: false, marketing: false };

function isBrowser() {
  return typeof window !== "undefined";
}

/*
 * Returns null when there is no usable decision — no answer yet, an
 * answer from an older version, or storage that cannot be read. All
 * three mean the same thing to callers: ask.
 */
export function readConsent() {
  if (!isBrowser()) {
    return null;
  }

  let raw;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    /*
     * Private browsing, or storage blocked entirely. Treated as "not
     * answered": the banner shows, and a choice simply will not persist.
     * Asking every visit is the safe failure — the alternative would be
     * assuming consent that was never given.
     */
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || parsed.version !== VERSION) {
      return null;
    }

    return {
      version: VERSION,
      decidedAt: parsed.decidedAt ?? null,
      ...DENY_ALL,
      ...Object.fromEntries(
        OPTIONAL_CATEGORIES.map((name) => [name, parsed[name] === true]),
      ),
    };
  } catch {
    return null;
  }
}

export function writeConsent(choices, { decidedAt } = {}) {
  const record = {
    version: VERSION,
    decidedAt: decidedAt ?? new Date().toISOString(),
    ...DENY_ALL,
    ...Object.fromEntries(
      OPTIONAL_CATEGORIES.map((name) => [name, choices?.[name] === true]),
    ),
  };

  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      /*
       * Unwritable storage does not stop the visitor: the choice applies
       * for this visit and is asked again next time.
       */
    }

    /*
     * Announced so anything gated on a category can react without this
     * module knowing it exists.
     */
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: record }));
  }

  return record;
}

export function hasConsent(category) {
  if (category === "necessary") {
    return true;
  }

  return readConsent()?.[category] === true;
}

/*
 * Subscription plumbing for useSyncExternalStore, which is how the
 * banner reads this without touching state inside an effect.
 *
 * The `storage` event is included so a decision made in one tab closes
 * the banner in the others: the same person answering the same question
 * twice is a bug, not diligence.
 */
export function subscribeToConsent(onChange) {
  if (!isBrowser()) {
    return () => {};
  }

  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/*
 * Booleans, not the record itself: useSyncExternalStore compares
 * snapshots by identity, and readConsent() builds a fresh object every
 * call, which would loop forever.
 */
export function hasDecided() {
  return readConsent() !== null;
}

/*
 * The server has no way to know whether this visitor has answered, and
 * guessing "not answered" would put the banner in the HTML for everyone
 * — including the returning visitors who already answered, who would see
 * it flash and disappear on every page load. Guessing "answered" keeps it
 * out of the server render entirely; the client then shows it if needed.
 */
export function hasDecidedOnServer() {
  return true;
}

/* Reopens the banner. The footer's "Manage Cookies" button calls this. */
export function openConsentManager() {
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT));
  }
}
