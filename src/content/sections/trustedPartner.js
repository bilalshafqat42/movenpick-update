/*
 * Field definitions for the Trusted Partner section: a partner logo, a
 * small label, a heading, and a short paragraph on a full-width brand
 * color panel, followed by a full-width photo with an overlapping card
 * (its own heading, text, and "Discover Accor" button).
 */
export const TRUSTED_PARTNER_FIELDS = [
  {
    key: "logo",
    label: "Partner logo",
    type: "IMAGE",
    helperText: "Recommended: 300×300px. SVG or transparent PNG preferred.",
    defaultValue: "/images/accor-logo.svg",
  },
  {
    key: "logo-alt",
    label: "Partner logo — alt text",
    type: "TEXT",
    defaultValue: "Accor",
  },
  {
    key: "label",
    label: "Label",
    type: "TEXT",
    defaultValue: "Our Trusted Partner",
  },
  {
    key: "heading",
    label: "Heading",
    type: "TEXT",
    defaultValue: "Duis Aute Irure Dolor In Reprehenderit",
  },
  {
    key: "text",
    label: "Text",
    type: "TEXT",
    long: true,
    defaultValue:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    key: "image",
    label: "Photo",
    type: "IMAGE",
    helperText: "Recommended: 1920×660px. Full-width banner photo.",
    defaultValue: "/images/trust.avif",
  },
  {
    key: "image-alt",
    label: "Photo — alt text",
    type: "TEXT",
    defaultValue: "[Add alt text for the Accor lobby photo]",
  },
  {
    key: "card-heading",
    label: "Card — Heading",
    type: "TEXT",
    defaultValue: "Duis Aute Irure Dolor In Reprehenderit",
  },
  {
    key: "card-text",
    label: "Card — Text",
    type: "TEXT",
    long: true,
    defaultValue:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    key: "cta-label",
    label: "Card — Button label",
    type: "TEXT",
    defaultValue: "Discover Accor",
  },
  {
    key: "cta-href",
    label: "Card — Button link",
    type: "LINK",
    defaultValue: "https://www.accor.com",
  },
];
