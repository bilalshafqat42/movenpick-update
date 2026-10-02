/*
 * Field definitions for the homepage Hero, matching exactly what's
 * currently hardcoded in src/components/Hero/HeroClient.js.
 */
export const HERO_FIELDS = [
  {
    key: "main-image",
    label: "Main image",
    type: "IMAGE",
    helperText: "Recommended: 1920×1080px or larger. Fills the whole screen — a smaller image will look blurry.",
    defaultValue: "/images/hero/main.avif",
  },
  {
    key: "main-image-alt",
    label: "Main image alt text",
    type: "TEXT",
    defaultValue: "[Add Movenpick hero image description]",
  },
  {
    key: "eyebrow",
    label: "Eyebrow",
    type: "TEXT",
    defaultValue: "[Eyebrow]",
  },
  {
    key: "heading",
    label: "Heading",
    type: "TEXT",
    defaultValue: "[Movenpick Project Name]",
  },
  {
    key: "text",
    label: "Text",
    type: "TEXT",
    long: true,
    defaultValue: "[Short description of the project — location, unit types]",
  },
  {
    key: "cta-label",
    label: "Button label",
    type: "TEXT",
    defaultValue: "Discover More",
  },
  {
    key: "cta-href",
    label: "Button link",
    type: "LINK",
    helperText: "Leave as #contact to open the enquiry form. Any other link or web address is used exactly as typed.",
    defaultValue: "#contact",
  },
  {
    key: "cta-icon",
    label: "Button icon (optional SVG upload — leave blank to use the default arrow)",
    type: "IMAGE",
    defaultValue: "",
  },
];
