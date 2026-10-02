import { getSiteUrl } from "@/lib/site-url";
import { fetchSeoData } from "@/lib/seo-api";

/*
 * Real /sitemap.xml. The homepage and the two legal pages are always
 * listed — /thank-you is a post-conversion confirmation step with nothing
 * for a crawler to index, and /chat-flow is an internal reference diagram
 * already marked noindex in its own metadata (see src/app/chat-flow/page.js),
 * so neither belongs here regardless of what the panel says.
 *
 * Beyond those fixed entries, 18 August 2026: any route a Super Admin has
 * added in the panel's SEO page (SitemapCard) is included too, fetched
 * from GET /api/v1/seo. Nothing declared there yet defaults to just the
 * fixed entries below, which is exactly what shipped before this existed —
 * adding this fetch cannot make the sitemap smaller than it already was.
 *
 * lastModified is deliberately omitted.
 *
 * It used to be the timestamp of the most recent content edit, read
 * straight from this app's database. That database is gone: content now
 * comes from the central admin panel, and the panel does not publish edit
 * timestamps through the content API (it has no reason to — nothing on a
 * rendered page needs them).
 *
 * The tempting substitute is the build or request time, and that is worse
 * than nothing. It would tell crawlers the content changed on every
 * deploy and every cache refresh, including deploys that only touched
 * CSS. A freshness signal that is always "just now" is one search engines
 * learn to discount, which costs more than having no signal at all. The
 * field is optional in the sitemap protocol, so leaving it out is honest.
 *
 * If it is ever wanted back, the right fix is for the content API to
 * return the site's last-edited timestamp and for this to read it — not
 * to reintroduce a database here.
 */
export default async function sitemap() {
  const siteUrl = getSiteUrl();

  const fixed = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const seo = await fetchSeoData();
  const fixedPaths = new Set(["/", "/privacy", "/terms"]);

  const declared = (seo?.sitemap ?? [])
    .filter((route) => !fixedPaths.has(route.path))
    .map((route) => ({
      url: route.path.startsWith("http") ? route.path : `${siteUrl}${route.path}`,
      changeFrequency: (route.changeFrequency ?? "monthly").toLowerCase(),
      priority: route.priority ?? 0.5,
    }));

  return [...fixed, ...declared];
}
