/*
 * The header's main nav menu, matching what's currently hardcoded in
 * src/components/Header/HeaderClient.js. This is a dedicated section
 * (rather than living inside a "Header" content section) because it's
 * one cross-cutting list, not page-specific copy — the same distinction
 * WordPress draws between Menus and page content.
 */
const NAV_ITEMS = [
  /*
   * About points at #project-overview, the section that opens with the
   * project description and carries the key facts (completion, payment
   * split, unit types, starting price) and the two calls to action.
   *
   * It used to point at #about, which does not exist anywhere on the
   * site, so the link silently did nothing. There is no "about us"
   * section on a single-project page; this overview is what a visitor
   * clicking About is looking for.
   */
  { label: "About", href: "#project-overview" },
  { label: "Location", href: "#location-map" },
  { label: "Amenities", href: "#amenities" },
  { label: "Payment Plan", href: "#payment-plan" },
  { label: "Contact", href: "#contact" },
];

export const NAVIGATION_ITEM_COUNT = NAV_ITEMS.length;

function itemFieldKey(itemNumber, fieldName) {
  return `nav-${itemNumber}-${fieldName}`;
}

/*
 * The header's "Request Callback" button, matching what's currently
 * hardcoded in HeaderClient.js. It lives here rather than in Appearance
 * because it's a button link (Editor-accessible), not a logo/favicon
 * asset (Admin-only) — the same content-vs-branding split the two roles
 * are built around.
 */
const HEADER_CTA_FIELDS = [
  {
    key: "header-cta-label",
    label: "Button label",
    type: "TEXT",
    defaultValue: "Request Callback",
  },
  {
    key: "header-cta-href",
    label: "Button link",
    type: "LINK",
    helperText: "Leave as #contact to open the enquiry form. Any other link or web address is used exactly as typed. Only applies on the homepage — the enquiry form does not appear on Privacy or Terms, so this link always works normally there.",
    defaultValue: "#contact",
  },
];

export const NAVIGATION_FIELDS = [
  ...NAV_ITEMS.flatMap((item, index) => {
    const itemNumber = index + 1;

    return [
      {
        key: itemFieldKey(itemNumber, "label"),
        label: `Menu item ${itemNumber} — Label`,
        type: "TEXT",
        defaultValue: item.label,
      },
      {
        key: itemFieldKey(itemNumber, "href"),
        label: `Menu item ${itemNumber} — Link`,
        type: "LINK",
        defaultValue: item.href,
      },
    ];
  }),
  ...HEADER_CTA_FIELDS,
];

export function shapeNavigationContent(content) {
  return Array.from({ length: NAVIGATION_ITEM_COUNT }, (_, index) => {
    const itemNumber = index + 1;

    return {
      label: content[itemFieldKey(itemNumber, "label")],
      href: content[itemFieldKey(itemNumber, "href")],
    };
  });
}

export function shapeHeaderCta(content) {
  return {
    label: content["header-cta-label"],
    href: content["header-cta-href"],
  };
}
