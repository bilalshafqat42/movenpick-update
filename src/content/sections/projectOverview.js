/*
 * Field definitions for the Project Overview section — the description
 * paragraph, four key-fact stats, and two call-to-action buttons that sit
 * directly under the Hero.
 */
export const PROJECT_OVERVIEW_FIELDS = [
  {
    key: "description",
    label: "Description paragraph",
    type: "TEXT",
    long: true,
    defaultValue:
      "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit, Sed Do Eiusmod Tempor Incididunt Ut Labore Et Dolore Magna Aliqua. Ut Enim Ad Minim Veniam. Duis Aute Irure Dolor In Reprehenderit In Voluptate Velit Esse Cillum Dolore",
  },
  {
    key: "stat-1-value",
    label: "Key fact 1 — value",
    type: "TEXT",
    defaultValue: "Q4 2028",
  },
  {
    key: "stat-1-label",
    label: "Key fact 1 — label",
    type: "TEXT",
    defaultValue: "Project Completion",
  },
  {
    key: "stat-2-value",
    label: "Key fact 2 — value",
    type: "TEXT",
    defaultValue: "40/60",
  },
  {
    key: "stat-2-label",
    label: "Key fact 2 — label",
    type: "TEXT",
    defaultValue: "Payment Plan",
  },
  {
    key: "stat-3-value",
    label: "Key fact 3 — value",
    type: "TEXT",
    defaultValue: "Studio - 2BR",
  },
  {
    key: "stat-3-label",
    label: "Key fact 3 — label",
    type: "TEXT",
    defaultValue: "Unit Types",
  },
  {
    key: "stat-4-value",
    label: "Key fact 4 — value",
    type: "TEXT",
    defaultValue: "From 799,000",
  },
  {
    key: "stat-4-label",
    label: "Key fact 4 — label",
    type: "TEXT",
    defaultValue: "Starting Price",
  },
  {
    key: "cta-1-label",
    label: "Primary button label",
    type: "TEXT",
    defaultValue: "Discover More",
  },
  {
    key: "cta-1-href",
    label: "Primary button link",
    type: "LINK",
    helperText: "Leave as #contact to open the enquiry form.",
    defaultValue: "#contact",
  },
  {
    key: "cta-2-label",
    label: "Secondary button label",
    type: "TEXT",
    defaultValue: "Download Brochure",
  },
  {
    key: "cta-2-href",
    label: "Secondary button link (brochure PDF)",
    type: "LINK",
    defaultValue: "/pdf/oceara-brochure.pdf",
  },
];
