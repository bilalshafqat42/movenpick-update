/*
 * "A day at Mövenpick" — the clickable timeline in the second Project
 * Overview (the full-screen copy just before the map). Choosing a time
 * swaps the photograph beneath the row.
 *
 * Static on purpose, like the overview's description: edited here, not
 * in the admin panel.
 *
 * The images are PLACEHOLDERS borrowed from elsewhere on the site. To
 * use the real photographs, drop them into public/images/day/ and point
 * each `image` at its file, e.g. "/images/day/morning-run.avif", and
 * update `alt` to describe what the photo actually shows. Landscape
 * images of at least 1920px wide work best: the photo spans the page.
 */
/* The section's heading and the line beneath it. */
export const OVERVIEW_DAY_HEADING = "A day at Mövenpick.";
export const OVERVIEW_DAY_INTRO =
  "From first light to the end of the evening, more of life happens within reach.";

export const OVERVIEW_DAY_ITEMS = [
  {
    time: "06:00",
    label: "Morning run",
    image: "/images/gallery/garden.avif",
    alt: "[Placeholder] Morning run",
  },
  {
    time: "07:00",
    label: "Technogym",
    image: "/images/gallery/wellness.avif",
    alt: "[Placeholder] Technogym",
  },
  {
    time: "08:00",
    label: "Coffee & breakfast",
    image: "/images/gallery/stone.avif",
    alt: "[Placeholder] Coffee and breakfast",
  },
  {
    time: "10:00",
    label: "Coworking",
    image: "/images/gallery/drawing.avif",
    alt: "[Placeholder] Coworking",
  },
  {
    time: "15:00",
    label: "Pool time",
    image: "/images/amenities/pool.avif",
    alt: "[Placeholder] Pool time",
  },
  {
    time: "17:00",
    label: "Move & play",
    image: "/images/gallery/game.avif",
    alt: "[Placeholder] Move and play",
  },
  {
    time: "19:00",
    label: "Together",
    image: "/images/gallery/boy.avif",
    alt: "[Placeholder] Together",
  },
  {
    time: "21:00",
    label: "Home",
    image: "/images/amenities/4bedrooms.avif",
    alt: "[Placeholder] Home",
  },
];
