export const TERMS_FIELDS = [
  {
    key: "title",
    label: "Title",
    type: "TEXT",
    defaultValue: "Terms & Conditions",
  },
  {
    key: "body",
    label: "Body",
    type: "RICHTEXT",
    /*
     * A placeholder, not real terms. See privacy.js's own note — this
     * needs Refine's legal counsel before it is relied on, and is then
     * edited from the central admin panel's Content section.
     */
    defaultValue:
      "<p>This is a placeholder. Replace this text with Terms & Conditions reviewed by Refine's legal counsel before publishing.</p>",
  },
];
