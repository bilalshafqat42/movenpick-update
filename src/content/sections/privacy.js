export const PRIVACY_FIELDS = [
  {
    key: "title",
    label: "Title",
    type: "TEXT",
    defaultValue: "Privacy Policy",
  },
  {
    key: "body",
    label: "Body",
    type: "RICHTEXT",
    /*
     * A placeholder, not a real policy. This must be replaced with copy
     * reviewed by Refine's legal counsel, covering what is actually
     * collected on this site (contact form submissions, cookies, UAE
     * PDPL rights) before this page is relied on by a real visitor.
     * Written and edited from the central admin panel's Content section
     * once German or Bilal is ready with reviewed text.
     */
    defaultValue:
      "<p>This is a placeholder. Replace this text with a Privacy Policy reviewed by Refine's legal counsel before publishing.</p>",
  },
];
