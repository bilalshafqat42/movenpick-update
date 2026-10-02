/*
 * The Floor Plan section: the Payment Plan's layout placed a second time
 * (see src/components/FloorPlan), with its own copy.
 *
 * Static on purpose: edited here, not in the admin panel.
 *
 * Everything below is still the Payment Plan's content, copied as the
 * starting point. Replace it with the floor plan details: the heading,
 * intro, photo, the two column names, and one row per line of the table
 * (add or remove rows freely; the table follows the list, and is left
 * out entirely while the list is empty).
 *
 * `units` are the buttons under the intro. Choosing one shows its
 * `heading` and `text` under a divider beneath the buttons (keep the
 * text to about two lines), and its `image` in the photo panel, whole and centred, with nothing behind it
 * (see .imagePanel[data-plans] in Payment.module.css). Floor plans live
 * in public/images/floor-plan/ as PNGs with a transparent background, so
 * they sit straight on the section's cream; a plan with a solid
 * background would show as a box.
 */
export const FLOOR_PLAN_CONTENT = {
  heading: "Floor Plan",
  text: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  image: "/images/payment/payment-plan.avif",
  imageAlt: "[Add alt text for the floor plan image]",
  columnLabels: ["Milestone", ""],
  units: [
    {
      label: "Studio",
      heading: "Studio heading",
      text: "Two lines about the studio: its size, layout and what sets it apart. Replace this placeholder.",
      image: "/images/floor-plan/studio.png",
      alt: "Studio floor plan with balcony, living and sleeping area, kitchen and bathroom",
    },
    {
      label: "1 Bedroom",
      heading: "1 Bedroom heading",
      text: "Two lines about the 1 bedroom: its size, layout and what sets it apart. Replace this placeholder.",
      image: "/images/floor-plan/1-bedroom.png",
      alt: "1 bedroom floor plan with balcony, living room, bedroom, kitchen and dining, dressing area, bathroom and guest WC",
    },
    {
      label: "2 Bedroom",
      heading: "2 Bedroom heading",
      text: "Two lines about the 2 bedroom: its size, layout and what sets it apart. Replace this placeholder.",
      image: "/images/floor-plan/2-bedroom-utility.png",
      alt: "2 bedroom with utility floor plan with balcony, two bedrooms, living room, kitchen and dining, bathrooms and utility room",
    },
  ],
  /*
   * Empty for now: the payment milestones copied in as a starting point
   * were removed. Add rows here ({ label, percent, sublabel }) and the
   * table reappears under the buttons.
   */
  rows: [],
};
