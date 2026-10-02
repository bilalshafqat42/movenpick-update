/*
 * Field definitions for the Amenities section: a centered heading and
 * intro paragraph, an add/remove list of key points — each with its own
 * photo AND its own description, swapped in together on hover/focus —
 * and a closing "Submit Request" button.
 *
 * Items are a real add/remove LIST field in the panel (Manager role and
 * above — see permissions.js's content.edit.list). Whatever items an
 * editor adds or removes there is exactly what appears on the page:
 * AmenitiesClient already derives its whole scroll-driven stage journey
 * from items.length, so no component change was needed to make this safe.
 */
const DEFAULT_ITEMS = [
  {
    title: "Duis Aute Irure Dolor In Reprehenderit",
    description:
      "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit, Sed Do Eiusmod Tempor Incididunt Ut Labore Et Dolore Magna Aliqua.",
    image: "/images/gallery/boy.avif",
    imageAlt: "Placeholder — replace with a real photo",
  },
  {
    title: "Duis Aute Irure Dolor In Reprehenderit",
    description:
      "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit, Sed Do Eiusmod Tempor Incididunt Ut Labore Et Dolore Magna Aliqua.",
    image: "/images/gallery/yacht.avif",
    imageAlt: "Placeholder — replace with a real photo",
  },
  {
    title: "Duis Aute Irure Dolor In Reprehenderit",
    description:
      "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit, Sed Do Eiusmod Tempor Incididunt Ut Labore Et Dolore Magna Aliqua.",
    image: "/images/gallery/wellness.avif",
    imageAlt: "Placeholder — replace with a real photo",
  },
  {
    title: "Duis Aute Irure Dolor In Reprehenderit",
    description:
      "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit, Sed Do Eiusmod Tempor Incididunt Ut Labore Et Dolore Magna Aliqua.",
    image: "/images/gallery/garden.avif",
    imageAlt: "Placeholder — replace with a real photo",
  },
];

export const AMENITIES_FIELDS = [
  {
    key: "heading",
    label: "Heading",
    type: "TEXT",
    defaultValue: "Duis Aute Irure Dolor In Reprehenderit",
  },
  {
    key: "intro-text",
    label: "Intro text",
    type: "TEXT",
    long: true,
    defaultValue:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    key: "items",
    label: "Items",
    type: "LIST",
    itemLabel: "Item",
    helperText:
      "Use + to add an item, the trash icon to remove one. Each item needs an image; title and description are shown in the hover/scroll panel.",
    itemFields: [
      { key: "title", label: "Title", type: "TEXT" },
      { key: "description", label: "Description", type: "TEXT", long: true },
      {
        key: "image",
        label: "Image",
        type: "IMAGE",
        helperText: "Recommended: 1600×1800px.",
      },
      { key: "imageAlt", label: "Image alt text", type: "TEXT" },
    ],
  },
  {
    key: "cta-label",
    label: "Button label",
    type: "TEXT",
    defaultValue: "Submit Request",
  },
];

/*
 * Reshapes the flat key -> value content map (what getSectionContent()
 * returns) into the prop shape AmenitiesClient actually renders.
 */
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

export function shapeAmenitiesContent(content) {
  const rawItems = (Array.isArray(content.items) ? content.items : []).filter(
    hasImage,
  );

  const items =
    rawItems.length > 0
      ? rawItems.map((item) => ({
          title: item?.title ?? "",
          description: item?.description ?? "",
          image: item?.image ?? "",
          imageAlt: item?.imageAlt ?? "",
        }))
      : DEFAULT_ITEMS;

  return {
    heading: content.heading,
    introText: content["intro-text"],
    items,
    ctaLabel: content["cta-label"],
  };
}
