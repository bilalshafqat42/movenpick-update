import "server-only";

import { mergeRowsOverDefaults } from "@/lib/section-defaults";

export { buildDefaultsFromFields } from "@/lib/section-defaults";

/*
 * The site's single content entry point. Every section wrapper (each
 * src/components/<Section>/index.js), the root layout, page.js, icon.js,
 * and robots.js read through this one function.
 *
 * This app holds no database. Content has exactly two possible sources:
 *
 * - CONTENT_API_URL set   -> the central admin panel, over HTTPS.
 * - CONTENT_API_URL unset -> the field defaults committed in
 *                            src/content/sections/, which are the copy
 *                            the site currently ships with.
 *
 * The second case is a first-class supported state, not a broken one. It
 * is how the site runs locally with no setup, and how it runs on Render
 * before the panel is connected: a complete, correct landing page that
 * simply cannot be edited yet. Deploying is therefore never blocked on
 * the panel being ready.
 *
 * The same path is also the failure mode: if the panel is unreachable,
 * misconfigured, or returns an error, getSectionRowsFromApi resolves to an
 * empty row list rather than throwing, so every field falls back to its
 * default and the site keeps serving real copy. That is what makes it safe
 * for a public marketing site to depend on another service to render.
 */
export async function getSectionContent(section, defaults) {
  if (!process.env.CONTENT_API_URL) {
    return { ...defaults };
  }

  /*
   * Imported dynamically so the module is only loaded when the panel is
   * actually configured, keeping it out of the work done on a request that
   * will just return defaults.
   */
  const { getSectionRowsFromApi } = await import("@/lib/content-api");

  const rows = await getSectionRowsFromApi(section);

  return mergeRowsOverDefaults(rows, defaults);
}
