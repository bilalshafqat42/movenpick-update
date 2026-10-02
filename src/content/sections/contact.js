/*
 * Shared by both the inline Contact section and the ContactPopup modal —
 * they show the same "Reach Out / To Us" form heading and submit button,
 * so one section keeps them in sync instead of risking two copies
 * drifting apart. Form fields, validation, and the legal consent text
 * are intentionally left out of this config — those aren't marketing
 * copy an Editor should be able to change freely.
 */
export const CONTACT_FIELDS = [
  {
    key: "eyebrow",
    label: "Eyebrow",
    type: "TEXT",
    defaultValue: "Reach Out",
  },
  {
    key: "heading",
    label: "Heading",
    type: "TEXT",
    defaultValue: "To Us",
  },
  {
    key: "description",
    label: "Description (shown above the form on the page section only)",
    type: "TEXT",
    long: true,
    defaultValue:
      "Our dedicated team is at your service to offer comprehensive insights into luxury investments across all Emirates of the UAE. Contact us today to embark on a journey towards a future characterized by opulence and excellence.",
  },
  {
    key: "submit-button-label",
    label: "Submit button label",
    type: "TEXT",
    defaultValue: "Submit A Request",
  },
];
