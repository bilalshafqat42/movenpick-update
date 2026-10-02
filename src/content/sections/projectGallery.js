/*
 * Field definitions for the Project Gallery — a full-bleed sequence the
 * visitor scrolls through horizontally.
 *
 * Slides are a real add/remove LIST field in the panel (Manager role and
 * above — see permissions.js's content.edit.list, since removing a slide
 * deletes content rather than changing it), not a fixed number of numbered
 * slots. Whatever slides an editor adds or removes there is exactly what
 * appears on the page: add 3, the site shows 3; add 6, it shows 6.
 */
const DEFAULT_SLIDES = [
  {
    image: "/images/slider.avif",
    alt: "Movenpick building exterior",
    heading: "Excepteur sint occaecat cupidatat",
    text:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
  },
  {
    image: "/images/gallery/game.avif",
    alt: "Placeholder — replace with a real photo",
    heading: "Excepteur sint occaecat cupidatat",
    text:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
  },
  {
    image: "/images/gallery/stone.avif",
    alt: "Placeholder — replace with a real photo",
    heading: "Excepteur sint occaecat cupidatat",
    text:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
  },
];

export const PROJECT_GALLERY_FIELDS = [
  {
    key: "slides",
    label: "Slides",
    type: "LIST",
    itemLabel: "Slide",
    helperText:
      "Use + to add a slide, the trash icon to remove one. Each slide needs an image; heading and caption are optional.",
    itemFields: [
      {
        key: "image",
        label: "Image",
        type: "IMAGE",
        helperText: "Recommended: 1920×1080px. Each slide fills the whole screen.",
      },
      { key: "alt", label: "Image alt text", type: "TEXT" },
      { key: "heading", label: "Heading", type: "TEXT" },
      { key: "text", label: "Caption", type: "TEXT", long: true },
    ],
  },
];

/*
 * A slide with no photograph is not a slide.
 *
 * See the note in gallery.js: the panel creates a list item the moment an
 * editor adds one and the image is filled in afterwards, so a half-made
 * entry reaches the page with `image` empty and renders <img src="">,
 * which browsers draw as the broken-image placeholder.
 */
const hasImage = (item) =>
  typeof item?.image === "string" && item.image.trim() !== "";

export function shapeProjectGalleryContent(content) {
  const items = (Array.isArray(content.slides) ? content.slides : []).filter(
    hasImage,
  );

  if (items.length > 0) {
    return items.map((item) => ({
      image: item?.image ?? "",
      alt: item?.alt ?? "",
      heading: item?.heading ?? "",
      text: item?.text ?? "",
    }));
  }

  /*
   * Nothing added in the panel yet, most likely because the panel isn't
   * connected (see @/lib/content.js's getSectionContent) or no one has used
   * the + button yet. Fall back to the original three-slide demo sequence
   * rather than rendering an empty gallery, matching every other section's
   * promise that a disconnected panel still serves a complete page.
   */
  return DEFAULT_SLIDES;
}
