/*
 * Cookie banner copy.
 *
 * Editable rather than hard-coded because consent wording is the part of
 * a site most likely to be revised by someone who is not a developer —
 * legal review, a new category, a change of tone.
 *
 * PLACEHOLDER PROSE, in the same [bracketed] convention the rest of the
 * site uses for copy that is still awaiting its owner. The wording a
 * consent banner uses is a legal statement about what this site actually
 * does with a visitor's data, so it is not something to invent and leave
 * looking finished — confident placeholder prose is the kind that gets
 * shipped by accident. Bracketed, it is obvious at a glance that nobody
 * has approved it yet.
 *
 * What is NOT bracketed, deliberately:
 *
 * - The button labels. They are the controls a visitor operates, they
 *   carry no claim about data, and "[Accept all]" would read as broken
 *   rather than as pending.
 * - The category names. Strictly necessary / Analytics / Marketing are
 *   the standard three and the code keys off them.
 * - The privacy policy link, which already points at a real page.
 */
export const COOKIES_FIELDS = [
  {
    key: "title",
    label: "Banner heading",
    type: "TEXT",
    defaultValue: "[Cookie banner heading]",
  },
  {
    key: "body",
    label: "Banner text",
    type: "TEXT",
    long: true,
    defaultValue:
      "[Cookie banner text — state which cookies this site sets, what each is for, and how long they last. Needs legal review before launch.]",
  },
  {
    key: "accept-label",
    label: '"Accept all" button',
    type: "TEXT",
    defaultValue: "Accept all",
  },
  {
    key: "reject-label",
    label: '"Reject" button',
    type: "TEXT",
    defaultValue: "Reject non-essential",
  },
  {
    key: "manage-label",
    label: '"Choose" button',
    type: "TEXT",
    defaultValue: "Choose",
  },
  {
    key: "save-label",
    label: '"Save choices" button',
    type: "TEXT",
    defaultValue: "Save my choices",
  },
  {
    key: "necessary-title",
    label: "Necessary category — name",
    type: "TEXT",
    defaultValue: "Strictly necessary",
  },
  {
    key: "necessary-body",
    label: "Necessary category — description",
    type: "TEXT",
    long: true,
    defaultValue:
      "[Describe the strictly necessary cookies — what they do and why they cannot be switched off.]",
  },
  {
    key: "analytics-title",
    label: "Analytics category — name",
    type: "TEXT",
    defaultValue: "Analytics",
  },
  {
    key: "analytics-body",
    label: "Analytics category — description",
    type: "TEXT",
    long: true,
    defaultValue:
      "We use Google Analytics to understand how visitors use this site. Only loads if you allow it here — nothing is loaded until you agree.",
  },
  {
    key: "marketing-title",
    label: "Marketing category — name",
    type: "TEXT",
    defaultValue: "Marketing",
  },
  {
    key: "marketing-body",
    label: "Marketing category — description",
    type: "TEXT",
    long: true,
    defaultValue:
      "[Describe the marketing cookies — which platforms, and what they are used for.]",
  },
  {
    key: "privacy-label",
    label: "Privacy policy link text",
    type: "TEXT",
    defaultValue: "Privacy Policy",
  },
  {
    key: "privacy-href",
    label: "Privacy policy link",
    type: "LINK",
    // Was "/privacy-policy", which 404s — this site's real route is
    // "/privacy" (see src/content/sections/privacy.js's own viewLiveHref).
    // Never touched after the section was set up, so the wrong default
    // was still what every visitor's cookie banner linked to.
    defaultValue: "/privacy",
  },
];
