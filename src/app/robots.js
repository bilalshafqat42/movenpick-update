import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { ROBOTS_FIELDS } from "@/content/sections/robotsTxt";
import { getSiteUrl } from "@/lib/site-url";

/*
 * Search engine and AI crawling defaults to blocked until an admin
 * explicitly turns it on in /admin-panel/robots — see
 * src/admin/sections/robotsTxt.js. That matches this project's original
 * reasoning: the final domain and hosting weren't decided yet, so
 * whatever URL this is temporarily reachable at (a Vercel preview link,
 * a staging subdomain, etc.) shouldn't get indexed and show up as
 * duplicate content once the real domain goes live.
 *
 * Link-preview bots (WhatsApp, Facebook, Slack, etc.) are always allowed
 * through below, regardless of the indexing toggle. They only fetch a
 * page once to build a share card, they don't index it or feed any
 * search engine, so letting them through doesn't conflict with the
 * indexing decision above — and blocking them would break social share
 * previews, which is a separate concern entirely.
 */
export default async function robots() {
  const content = await getSectionContent(
    "robots",
    buildDefaultsFromFields(ROBOTS_FIELDS),
  );

  const allowIndexing = content["allow-indexing"] === "true";
  const sitemapUrl = content["sitemap-url"] || `${getSiteUrl()}/sitemap.xml`;

  return {
    rules: [
      {
        userAgent: "*",
        ...(allowIndexing ? { allow: "/" } : { disallow: "/" }),
      },
      {
        userAgent: [
          "facebookexternalhit",
          "WhatsApp",
          "Twitterbot",
          "LinkedInBot",
          "Slackbot",
          "TelegramBot",
          "Discordbot",
        ],
        allow: "/",
      },
    ],
    ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
  };
}
