import "server-only";

import { cache } from "react";

import { getSiteKey } from "@/lib/site-key";

/*
 * Reads the central admin panel's SEO suite (GET /api/v1/seo): sitemap
 * routes and typed structured data blocks. Mirrors content-api.js's own
 * three properties exactly, for the same reasons: never throws (a failure
 * here must degrade the site, never break it), one request rather than one
 * per consumer, and a hard timeout so an unreachable panel cannot hang a
 * page render behind it.
 *
 * Deliberately does NOT cover meta tags or robots.txt: this site already
 * has a working, independent mechanism for both (the manifest-declared
 * "seo" and "robots" content sections, read in layout.js/robots.js) with
 * real live values. The panel's newer SiteSeo record for this site holds
 * different values from those — nobody has reconciled the two yet, and
 * switching either one without a decision on which is authoritative risks
 * a real regression on values search engines already have indexed. See
 * ADMIN-PANEL-ROADMAP.md's Phase 6 note, 18 August 2026.
 */
const REQUEST_TIMEOUT_MS = 5000;

function isFrameworkSignal(error) {
  return typeof error?.digest === "string";
}

export const fetchSeoData = cache(async () => {
  const baseUrl = process.env.CONTENT_API_URL;
  const token = process.env.CONTENT_API_TOKEN;

  if (!baseUrl || !token) {
    return null;
  }

  try {
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/api/v1/seo`);
    url.searchParams.set("site", getSiteKey());

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        "x-api-key": token,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 300, tags: ["seo"] },
    });

    if (!response.ok) {
      console.error("SEO API responded with status:", response.status, response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    if (isFrameworkSignal(error)) {
      throw error;
    }
    console.error("SEO API request failed:", error?.message);
    return null;
  }
});
