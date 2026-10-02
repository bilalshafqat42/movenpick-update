import "server-only";

import { cache } from "react";
import { cookies, draftMode } from "next/headers";

import { getSiteKey } from "@/lib/site-key";
import { normaliseContentPayload } from "@/lib/content-shape";
import { PREVIEW_TOKEN_COOKIE } from "@/lib/preview-mode";

/*
 * Reads site content over HTTP from the admin service's content API.
 *
 * This is the public site's content source once the two are deployed
 * separately: the public service holds no database credentials at all,
 * so the only way it can see edited content is to ask the service that
 * does own the database. See src/lib/content.js for how the two sources
 * are selected between.
 *
 * Three deliberate properties, in order of how much they matter:
 *
 * 1. NEVER THROWS. A failure here returns an empty section map, which
 *    means every field falls back to the hardcoded defaultValue in
 *    src/admin/sections/*.js — today's real copy. So the admin service
 *    being down, redeploying, or unreachable degrades the site to
 *    "shows the copy it shipped with", never to a blank page or a 500.
 *    This is the single reason it is acceptable for the public site to
 *    depend on another service to render.
 *
 * 2. ONE REQUEST FOR EVERY SECTION, not one per section. The homepage
 *    renders around fourteen sections; fourteen sequential HTTP calls
 *    per render would be slower than the database queries this replaces.
 *    The whole payload is site copy — tens of kilobytes — so fetching it
 *    in one go and picking sections out of it locally is both simpler and
 *    faster.
 *
 * 3. HARD TIMEOUT. Without one, an admin service that accepts the
 *    connection and then stalls would hang the page render behind it for
 *    as long as the platform allows. A timeout turns that into the
 *    fallback path in (1) after a bounded wait.
 */
const REQUEST_TIMEOUT_MS = 5000;

/*
 * Time-based revalidation is only a safety net here: saveSectionAction
 * pings this service's /api/revalidate webhook on every save, so edits
 * appear immediately rather than after this window. The window exists to
 * bound how long the site can stay stale if a webhook is ever missed
 * (admin service restarting mid-save, a transient network failure, or a
 * second public instance that did not receive the ping — see the
 * multi-instance note in render.yaml).
 *
 * This also settles the open "sensible ISR fallback interval" item in
 * Phase 6 of ADMIN-ROADMAP.md.
 *
 * Clamped to a minimum of one second, which is not cosmetic: `revalidate:
 * 0` means "never cache", and a `revalidate: 0` fetch inside a route that
 * was prerendered at build time makes that route dynamic at request time.
 * Next.js rejects that transition outright — the homepage returns a 500
 * reading "Page changed from static to dynamic at runtime", on every
 * request, for every visitor. Setting CONTENT_CACHE_SECONDS=0 to mean
 * "always fetch fresh" is the obvious thing for someone to try, so the
 * floor turns a total outage into a one-second cache instead.
 */
const MIN_CACHE_SECONDS = 1;
const DEFAULT_CACHE_SECONDS = 300;

function cacheSeconds() {
  const configured = Number.parseInt(
    process.env.CONTENT_CACHE_SECONDS ?? "",
    10,
  );

  if (!Number.isFinite(configured) || configured < 0) {
    return DEFAULT_CACHE_SECONDS;
  }

  return Math.max(configured, MIN_CACHE_SECONDS);
}

/*
 * Next.js signals control flow by throwing tagged errors: a route
 * becoming dynamic (DynamicServerError), redirect(), notFound(), and
 * forbidden() all surface as throws carrying a string `digest`, and the
 * framework — not application code — is meant to catch them.
 *
 * The broad catch below exists so that an unreachable admin service
 * degrades to the built-in defaults. Without this guard it also swallows
 * those framework signals, which is strictly worse than the failure it is
 * protecting against: the render continues in a state Next.js believes it
 * has already aborted, and the resulting error names this file rather
 * than whatever actually made the route dynamic. Found exactly that way,
 * chasing a 500 that pointed here instead of at the real cause.
 */
function isFrameworkSignal(error) {
  return typeof error?.digest === "string";
}

export const CONTENT_CACHE_TAG = "content";

/*
 * Wrapped in React's cache() as well as the fetch cache: cache() dedupes
 * within a single render pass (so fourteen section reads share one
 * result even on a cache miss), while the fetch cache below is what
 * spans separate requests.
 */
/*
 * One retry on a transient failure.
 *
 * Without it, a single dropped connection or a redeploy of the panel means
 * this site serves its built-in defaults for the entire cache window — up to
 * five minutes of the wrong content because of a blip that lasted
 * milliseconds. A page render already waits on this call, so one quick retry
 * is far cheaper than that.
 *
 * Deliberately NOT retried on a 4xx: a 401 means the token is wrong and a 404
 * means the route or site key is wrong. Neither improves on a second attempt,
 * and retrying an auth failure just doubles the noise while the panel's rate
 * limiter counts it twice.
 */
const RETRY_DELAY_MS = 250;

function isWorthRetrying(response, error) {
  if (error) {
    // Timeout, DNS failure, connection reset — all transient by nature.
    return true;
  }

  return response.status >= 500 || response.status === 429;
}

async function requestContentOnce(url, token, { isPreview = false } = {}) {
  return fetch(url, {
    /*
     * Both header styles are sent deliberately.
     *
     * The panel is a separate application and, probed from outside, it
     * rejects a dummy credential identically whether it arrives as
     * `Authorization: Bearer` or `x-api-key` — so which one it actually
     * reads is not observable without its source. Sending both means the
     * link works either way instead of failing with a 401 that is
     * indistinguishable from a wrong token.
     *
     * It costs nothing in exposure: the same secret, to the same host,
     * over the same TLS connection. If the panel's scheme is ever
     * confirmed, drop the other one.
     */
    headers: {
      authorization: `Bearer ${token}`,
      "x-api-key": token,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    /*
     * A preview request must never be cached, by this layer or Next's own
     * fetch cache — the whole point is always showing the current draft,
     * not whatever it looked like at the moment draft mode was entered.
     * Ordinary requests still opt into caching explicitly (fetch is NOT
     * cached by default in this version of Next.js), tagged so the
     * revalidation webhook can invalidate it on demand the moment an editor
     * publishes.
     */
    ...(isPreview
      ? { cache: "no-store" }
      : { next: { revalidate: cacheSeconds(), tags: [CONTENT_CACHE_TAG] } }),
  });
}

export const fetchAllContent = cache(async () => {
  const baseUrl = process.env.CONTENT_API_URL;
  const token = process.env.CONTENT_API_TOKEN;

  if (!baseUrl) {
    return {};
  }

  if (!token) {
    console.error(
      "CONTENT_API_TOKEN is not set — cannot read content from the admin service. Falling back to built-in defaults.",
    );

    return {};
  }

  try {
    /*
     * The site key travels as a query parameter rather than a header so it
     * is part of the URL: it shows up in the admin panel's access logs,
     * and it keeps the request cacheable per site by any intermediary that
     * keys on URL. A header would make two different sites' requests look
     * identical to anything sitting in between.
     */
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/api/content`);
    url.searchParams.set("site", getSiteKey());

    /*
     * Draft mode is Next's own signal that this request is for a preview
     * (see /api/preview's route — entering it is the only way this is ever
     * true); the actual token travels in its own cookie alongside it,
     * since draftMode()'s cookie only carries an on/off flag. Both must be
     * present: draft mode without a token means the cookie expired or was
     * cleared, and falling through to ordinary published content here is
     * the same fail-open behaviour the panel's own /api/content applies to
     * an invalid token.
     */
    const draft = await draftMode();
    let isPreview = false;

    if (draft.isEnabled) {
      const cookieStore = await cookies();
      const previewToken = cookieStore.get(PREVIEW_TOKEN_COOKIE)?.value;

      if (previewToken) {
        url.searchParams.set("status", "draft");
        url.searchParams.set("token", previewToken);
        isPreview = true;
      }
    }

    let response = null;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }

      try {
        response = await requestContentOnce(url, token, { isPreview });
        lastError = null;
      } catch (requestError) {
        if (isFrameworkSignal(requestError)) {
          throw requestError;
        }

        response = null;
        lastError = requestError;
      }

      if (response && !isWorthRetrying(response, null)) {
        break;
      }

      if (lastError && attempt === 1) {
        throw lastError;
      }
    }

    if (!response) {
      throw lastError ?? new Error("Content API request failed.");
    }

    if (!response.ok) {
      /*
       * Status only. The body of a failed auth/misconfiguration response
       * is not useful here and echoing a remote service's error text into
       * our logs is how tokens end up in log drains.
       */
      console.error(
        "Content API responded with status:",
        response.status,
        response.statusText,
      );

      return {};
    }

    const payload = await response.json();

    /*
     * Deliberately tolerant of the response shape — see content-shape.js.
     * A strict read would turn any reasonable variation into a site quietly
     * rendering its defaults, which is indistinguishable from "not connected
     * yet" and has no error to follow.
     */
    const sections = normaliseContentPayload(payload);

    if (Object.keys(sections).length === 0) {
      /*
       * Authenticated, parsed, and empty. Legitimate before the panel has
       * any content seeded, so not an error — but logged, because it is also
       * exactly what an unrecognised response shape looks like, and that
       * distinction is impossible to make later from a page that simply
       * looks unchanged.
       */
      console.warn(
        "Content API returned no usable sections. Expected { sections: { <slug>: [...] } }. Falling back to built-in defaults.",
      );
    }

    return sections;
  } catch (error) {
    /*
     * Framework signals are re-thrown untouched — see isFrameworkSignal.
     */
    if (isFrameworkSignal(error)) {
      throw error;
    }

    /*
     * AbortError (the timeout above) lands here alongside DNS/connection
     * failures and malformed JSON. All of them mean the same thing to the
     * caller: use the defaults.
     */
    console.error("Content API request failed:", error?.message);

    return {};
  }
});

/*
 * Returns the stored rows for one section in the same shape
 * mergeRowsOverDefaults() expects from the database reader, so both
 * content sources are interchangeable.
 */
export async function getSectionRowsFromApi(section) {
  const sections = await fetchAllContent();

  return sections[section] ?? [];
}
