/*
 * Matches what's currently hardcoded in src/app/layout.js: the page
 * metadata (title/description), the Open Graph fields (this is what
 * controls the preview card WhatsApp, Slack, iMessage, etc. show when a
 * link to the site is shared — "og" as in Open Graph, not a mailer), and
 * the schema.org structured data.
 *
 * Structured data is deliberately individual fields here rather than a
 * raw JSON editor: a typo in free-form JSON silently breaks it with no
 * visible symptom on the site itself, which is a bad failure mode for
 * something that only search engines and social crawlers ever read.
 */
export const SEO_FIELDS = [
  {
    key: "meta-title",
    label: "Page title",
    type: "TEXT",
    defaultValue: "Movenpick by Refine | [tagline]",
  },
  {
    key: "meta-description",
    label: "Page description",
    type: "TEXT",
    long: true,
    defaultValue: "[Movenpick meta description]",
  },
  {
    key: "og-title",
    label: "Social share title (WhatsApp, iMessage, Slack, etc.)",
    type: "TEXT",
    defaultValue: "Movenpick by Refine | [tagline]",
  },
  {
    key: "og-description",
    label: "Social share description",
    type: "TEXT",
    long: true,
    defaultValue: "[Movenpick meta description]",
  },
  {
    key: "og-image",
    label: "Social share image (WhatsApp, iMessage, Slack, etc.)",
    type: "IMAGE",
    helperText:
      "Recommended 1200×630px. WhatsApp caches the old preview per link for a while after you change this — share the link to yourself once after saving to force a fresh preview.",
    defaultValue: "/images/og/og.jpg",
  },
  {
    key: "schema-name",
    label: "Structured data — Business name",
    type: "TEXT",
    defaultValue: "Movenpick",
  },
  {
    key: "schema-description",
    label: "Structured data — Description",
    type: "TEXT",
    long: true,
    defaultValue: "[Movenpick structured-data description]",
  },
  {
    key: "schema-address-locality",
    label: "Structured data — Community / area name",
    type: "TEXT",
    defaultValue: "[community/area name]",
  },
  {
    key: "schema-address-region",
    label: "Structured data — Emirate / region",
    type: "TEXT",
    defaultValue: "Dubai",
  },
  {
    key: "schema-address-country",
    label: "Structured data — Country code",
    type: "TEXT",
    defaultValue: "AE",
  },
  {
    key: "schema-org-name",
    label: "Structured data — Developer name",
    type: "TEXT",
    defaultValue: "Refine",
  },
  {
    key: "schema-org-url",
    label: "Structured data — Developer website",
    type: "LINK",
    defaultValue: "https://www.refinedubai.com",
  },
  /*
   * Google Search Console verification moved to the Integrations section
   * (src/content/sections/integrations.js) — it lived here as a TEXT field
   * with its own SUPER_ADMIN override, but a client's Bilal-equivalent kept
   * landing on this SEO page looking for it alongside GTM and GA4, which
   * were on an entirely separate page. One page for every Google
   * integration is the fix; Bing's own field stays here, since it isn't
   * one of the three that caused the confusion.
   */
  {
    key: "bing-site-verification",
    label: "Bing Webmaster Tools verification code",
    type: "TEXT",
    defaultValue: "",
  },
];
