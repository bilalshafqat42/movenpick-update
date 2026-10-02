/*
 * Structured toggles rather than a raw robots.txt editor — a mistake in
 * free-form text could silently block every search engine from the
 * whole site with no obvious warning. These two controls cover the
 * actual decision that needs making here.
 *
 * Link-preview bots (WhatsApp, Slack, etc. — see src/app/robots.js) stay
 * allowed unconditionally regardless of this toggle, since blocking them
 * would break social share previews, which is a separate concern from
 * search engine indexing.
 */
export const ROBOTS_FIELDS = [
  {
    key: "allow-indexing",
    label: "Allow search engines to index this site",
    type: "BOOLEAN",
    defaultValue: "false",
  },
  {
    key: "sitemap-url",
    label: "Sitemap URL override (leave blank to use the auto-generated /sitemap.xml)",
    type: "LINK",
    defaultValue: "",
  },
];
