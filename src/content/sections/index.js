import { AMENITIES_FIELDS } from "@/content/sections/amenities";
import { HERO_FIELDS } from "@/content/sections/hero";
import { PROJECT_OVERVIEW_FIELDS } from "@/content/sections/projectOverview";
import { PROJECT_GALLERY_FIELDS } from "@/content/sections/projectGallery";
import { TRUSTED_PARTNER_FIELDS } from "@/content/sections/trustedPartner";
import { SEA_SECTION_FIELDS } from "@/content/sections/seaSection";
import { PAYMENT_FIELDS } from "@/content/sections/payment";
import { LOCATION_FIELDS } from "@/content/sections/location";
import { PROJECT_FIELDS } from "@/content/sections/project";
import { GALLERY_FIELDS } from "@/content/sections/gallery";
import { CONTACT_FIELDS } from "@/content/sections/contact";
import { FOOTER_FIELDS } from "@/content/sections/footer";
import { NAVIGATION_FIELDS } from "@/content/sections/navigation";
import { APPEARANCE_FIELDS } from "@/content/sections/appearance";
import { CHAT_AGENT_FIELDS } from "@/content/sections/chatAgent";
import { SEO_FIELDS } from "@/content/sections/seo";
import { ROBOTS_FIELDS } from "@/content/sections/robotsTxt";
import { PRIVACY_FIELDS } from "@/content/sections/privacy";
import { TERMS_FIELDS } from "@/content/sections/terms";
import { COOKIES_FIELDS } from "@/content/sections/cookies";
import { INTEGRATIONS_FIELDS } from "@/content/sections/integrations";

/*
 * Every editable section registers itself here: a slug (used in the
 * /admin-panel/[section] URL), a label for the sidebar, which sidebar
 * group it belongs to, the minimum role allowed to view/edit it, and its
 * list of fields. Adding a new section to the admin panel means adding
 * one entry here plus one sections/<name>.js file — nothing else in the
 * admin UI needs to change.
 */
export const SECTION_REGISTRY = {
  navigation: {
    label: "Menu & CTA Link",
    group: "header",
    minRole: "EDITOR",
    fields: NAVIGATION_FIELDS,
  },
  appearance: {
    label: "Logo & Favicon",
    group: "header",
    minRole: "ADMIN",
    fields: APPEARANCE_FIELDS,
  },
  hero: {
    label: "Hero",
    group: "content",
    minRole: "EDITOR",
    fields: HERO_FIELDS,
  },
  projectOverview: {
    label: "Project Overview",
    group: "content",
    minRole: "EDITOR",
    fields: PROJECT_OVERVIEW_FIELDS,
  },
  amenities: {
    label: "Amenities",
    group: "content",
    minRole: "EDITOR",
    fields: AMENITIES_FIELDS,
  },
  projectGallery: {
    label: "Project Gallery",
    group: "content",
    minRole: "EDITOR",
    fields: PROJECT_GALLERY_FIELDS,
  },
  trustedPartner: {
    label: "Trusted Partner",
    group: "content",
    minRole: "EDITOR",
    fields: TRUSTED_PARTNER_FIELDS,
  },
  location: {
    label: "Location",
    group: "content",
    minRole: "EDITOR",
    fields: LOCATION_FIELDS,
  },
  project: {
    label: "Project",
    group: "content",
    minRole: "EDITOR",
    fields: PROJECT_FIELDS,
  },
  gallery: {
    label: "Gallery",
    group: "content",
    minRole: "EDITOR",
    fields: GALLERY_FIELDS,
  },
  contact: {
    label: "Contact",
    group: "content",
    minRole: "EDITOR",
    fields: CONTACT_FIELDS,
  },
  seaSection: {
    label: "Sea Section",
    group: "content",
    minRole: "EDITOR",
    fields: SEA_SECTION_FIELDS,
  },
  payment: {
    label: "Payment Plan",
    group: "content",
    minRole: "EDITOR",
    fields: PAYMENT_FIELDS,
  },
  footer: {
    label: "Footer",
    group: "content",
    minRole: "EDITOR",
    fields: FOOTER_FIELDS,
  },
  chatAgent: {
    label: "Chat Widget",
    group: "content",
    minRole: "EDITOR",
    fields: CHAT_AGENT_FIELDS,
  },
  /*
   * ADMIN, not EDITOR, unlike the rest of "content": legal copy has a
   * different kind of consequence than a heading or an image, closer to
   * SEO below than to About or Amenities.
   */
  privacy: {
    label: "Privacy Policy",
    group: "content",
    minRole: "ADMIN",
    fields: PRIVACY_FIELDS,
    viewLiveHref: "/privacy",
    viewLiveLabel: "View live page",
  },
  terms: {
    label: "Terms & Conditions",
    group: "content",
    minRole: "ADMIN",
    fields: TERMS_FIELDS,
    viewLiveHref: "/terms",
    viewLiveLabel: "View live page",
  },
  /*
   * EDITOR, not ADMIN. Consent copy is legal-adjacent, same as Privacy and
   * Terms above, but gating it at ADMIN in practice meant nobody but a
   * site Admin could ever update it — Oceara's own cookie notice, built
   * independently, was registered at EDITOR from the start, and the
   * managers who actually maintain day-to-day site copy need to reach
   * this too. Matches Oceara's precedent rather than Privacy/Terms'.
   */
  cookies: {
    label: "Cookie Banner",
    group: "content",
    minRole: "EDITOR",
    fields: COOKIES_FIELDS,
  },
  seo: {
    label: "SEO & Sharing",
    group: "seo",
    minRole: "ADMIN",
    fields: SEO_FIELDS,
  },
  robots: {
    label: "robots.txt",
    group: "seo",
    minRole: "ADMIN",
    fields: ROBOTS_FIELDS,
    viewLiveHref: "/robots.txt",
    viewLiveLabel: "View / download robots.txt",
  },
  sitemap: {
    label: "Sitemap",
    group: "seo",
    minRole: "ADMIN",
    fields: [],
    viewLiveHref: "/sitemap.xml",
    viewLiveLabel: "View / download sitemap.xml",
  },
  /*
   * SUPER_ADMIN, not ADMIN: this site's own Admin (a customer account, e.g.
   * German) is deliberately not the right person to hold any of these three
   * Google integrations. Not about trust — a wrong or swapped ID silently
   * breaks analytics or search verification for everyone, invisibly, and
   * these are Refine's own integrations to manage on the client's behalf,
   * the same reasoning MIN_ROLE_VALUES documents in
   * src/lib/manifest/schema.mjs.
   *
   * One page for all three (Search Console, GTM, GA4) rather than Search
   * Console living on the SEO page and the other two here — see
   * integrations.js's own comment for why that split was the actual
   * confusion, not any one field being hard to find.
   */
  integrations: {
    label: "Integrations",
    group: "seo",
    minRole: "SUPER_ADMIN",
    fields: INTEGRATIONS_FIELDS,
  },
};

/*
 * Sidebar groups, in display order. A group with no accessible sections
 * for the current role (or none built yet) still shows, with a
 * "Coming soon" note — see Sidebar.js.
 */
export const SECTION_GROUPS = [
  { key: "header", label: "Header" },
  { key: "content", label: "Content" },
  { key: "seo", label: "SEO & Sharing" },
];

export function getSectionConfig(slug) {
  return SECTION_REGISTRY[slug] ?? null;
}

export function listSectionSlugs() {
  return Object.keys(SECTION_REGISTRY);
}

export function listSectionsByGroup(groupKey) {
  return Object.entries(SECTION_REGISTRY)
    .filter(([, config]) => config.group === groupKey)
    .map(([slug, config]) => ({ slug, ...config }));
}
