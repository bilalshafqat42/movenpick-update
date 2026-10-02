/*
 * The logo is rendered via a CSS mask (see Header.module.css .logoMark)
 * so it can recolor automatically as the header switches between light
 * and dark states while scrolling. That technique only looks right with
 * a solid silhouette image (an SVG or a PNG with a transparent
 * background) — a full-colour photo would just render as a solid-colour
 * blob. Worth keeping in mind when uploading a replacement.
 */
export const APPEARANCE_FIELDS = [
  {
    key: "logo",
    label:
      "Logo — SVG preferred (or transparent PNG, at least 300×82px / 600×164px for retina). Displayed at 147×40px in the header, aspect ratio 3.6:1 — see note above",
    type: "IMAGE",
    defaultValue: "/logos/movenpick-logo.svg",
  },
  {
    key: "favicon",
    label:
      "Favicon — square image, at least 512×512px (SVG or PNG, transparent background recommended)",
    type: "IMAGE",
    defaultValue: "/logos/movenpick-favicon.svg",
  },
];
