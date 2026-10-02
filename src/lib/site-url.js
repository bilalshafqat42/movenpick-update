/*
 * The site's own absolute base URL, used for canonical metadata, Open Graph
 * URLs, robots.txt's Sitemap line, and sitemap.xml entries.
 *
 * Resolution order, and why it is this order:
 *
 * 1. SITE_URL — set explicitly on Render (and on any host that is not
 *    Vercel). The only one of the three guaranteed to be the real
 *    customer-facing domain rather than a platform-generated hostname, so it
 *    wins.
 *
 * 2. VERCEL_PROJECT_PRODUCTION_URL — set automatically by Vercel, kept as a
 *    fallback so a Vercel deployment keeps working unchanged and a rollback
 *    needs no code change.
 *
 * 3. localhost — development.
 *
 * Getting this wrong is close to invisible, which is why it is worth the
 * explanation: with neither variable set, this returns http://localhost:3000
 * in production. Nothing errors, no page looks broken, and no test fails.
 * What actually happens is that sitemap.xml advertises localhost URLs to
 * Google, robots.txt points at a localhost sitemap, and every WhatsApp or
 * social share resolves its preview image against localhost and shows
 * nothing. That is a real SEO and marketing regression discovered weeks
 * later, so SITE_URL is a required environment variable in production rather
 * than an optional one.
 */

/*
 * Normalisation exists because of a real failed deploy: SITE_URL was entered
 * as "movenpick.refinedubai.com", with no scheme. That is an entirely
 * reasonable thing to type into a box labelled "site URL", but `new URL()`
 * rejects a bare hostname, so the build died in generateMetadata with
 * `TypeError: Invalid URL` pointing at layout.js — a message that says
 * nothing about which environment variable was wrong or why.
 *
 * A missing scheme is unambiguous and safe to repair, so it is repaired
 * rather than rejected. Anything genuinely unparseable still fails, but with
 * an error that names the variable, shows the value, and says what to do.
 * Failing loudly is deliberate: silently falling back to localhost would
 * publish localhost URLs to search engines, and a broken build is far
 * cheaper to fix than that.
 */
function normaliseSiteUrl(value, variableName) {
  let candidate = value.trim().replace(/\/+$/, "");

  /*
   * Scheme-relative ("//example.com") is treated as missing rather than
   * having an empty scheme, since it cannot be resolved without a base.
   */
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, "")}`;
  }

  try {
    /*
     * Round-tripped through URL so the returned string is always a valid,
     * canonical origin — and so anything malformed is caught here, at the
     * one place that knows which variable it came from.
     */
    const parsed = new URL(candidate);

    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    throw new Error(
      `${variableName} is not a valid URL: "${value}". ` +
        `Use the full origin including the scheme, e.g. https://movenpick.refinedubai.com`,
    );
  }
}

export function getSiteUrl() {
  const explicit = process.env.SITE_URL?.trim();

  if (explicit) {
    return normaliseSiteUrl(explicit, "SITE_URL");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    /*
     * Vercel sets this as a bare hostname by design, so it goes through the
     * same normalisation rather than having "https://" concatenated on
     * separately.
     */
    return normaliseSiteUrl(
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      "VERCEL_PROJECT_PRODUCTION_URL",
    );
  }

  return "http://localhost:3000";
}
