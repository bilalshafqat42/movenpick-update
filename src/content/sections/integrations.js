/*
 * Every Google integration in one place, on purpose: Search Console
 * verification used to live on the SEO & Sharing page while GTM and GA4
 * lived here, and the split was the actual source of confusion, not any
 * one field being hard to find — someone landing on SEO & Sharing looking
 * for "the Google stuff" only ever found a third of it there.
 *
 * SUPER_ADMIN throughout, not ADMIN: a customer's own Admin account is
 * deliberately not the right person to hold any of these three. Not about
 * trust — a wrong or swapped ID silently breaks analytics, or an
 * unverified Search Console property loses search performance data, for
 * everyone, invisibly, and these are Refine's own integrations to manage
 * on the client's behalf.
 *
 * GTM and GA4 are two independent ways to get analytics running, not two
 * steps of one setup. Recommended, and the simpler path: GTM alone, with
 * GA4 added as a tag inside the GTM container's own dashboard. The direct
 * GA4 field exists for whoever would rather skip GTM's dashboard entirely.
 * Do not fill in both pointed at the same GA4 property: GTM configured to
 * also load GA4 would fire every pageview twice, once from each script.
 *
 * Neither GTM nor GA4 loads unconditionally. src/components/GoogleTagManager
 * only renders once a visitor has allowed the "analytics" cookie category
 * — see src/lib/cookieConsent.js's hasConsent() and the Cookie Banner
 * section's own fields, which describe this to the visitor. An empty
 * value here means nothing loads at all, regardless of consent. Search
 * Console verification has no such gate — it is a static meta tag, not a
 * script, and carries no visitor data at all.
 */
export const INTEGRATIONS_FIELDS = [
  {
    key: "google-site-verification",
    label: "Google Search Console verification code",
    type: "TEXT",
    helperText:
      "The content value of the verification meta tag, not the whole tag. From search.google.com/search-console — add a property, choose HTML tag verification, and copy only the value inside content=\"...\".",
    defaultValue: "",
  },
  {
    key: "gtm-container-id",
    label: "Google Tag Manager container ID",
    type: "TEXT",
    helperText:
      "e.g. GTM-XXXXXXX. Recommended: configure Google Analytics (GA4) as a tag inside your GTM container's own dashboard rather than filling in the GA4 field below too — see this section's own note on why not both. Only loads once a visitor allows the Analytics cookie category.",
    defaultValue: "",
  },
  {
    key: "ga4-measurement-id",
    label: "Google Analytics (GA4) measurement ID",
    type: "TEXT",
    helperText:
      "e.g. G-XXXXXXXXXX. Only needed if you are not using GTM to load GA4 — leave blank if GA4 is already configured as a tag inside your GTM container above. Only loads once a visitor allows the Analytics cookie category.",
    defaultValue: "",
  },
];
