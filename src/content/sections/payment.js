/*
 * Field definitions for the Payment Plan section: a centered heading and
 * intro paragraph, a photo, and a milestone-by-milestone payment
 * breakdown table. Like Amenities and Gallery, the milestone count is
 * fixed; the admin can edit each row's label, percentage, and sub-label
 * but not add or remove rows.
 */
const MILESTONES = [
  {
    label: "Booking",
    percent: "5%",
    sublabel: "On Booking / Reservation",
  },
  {
    label: "1st Installment - DLD",
    percent: "15%",
    sublabel: "Within 60 Days Of Booking",
  },
  {
    label: "2nd Installment",
    percent: "5%",
    sublabel: "6 Months After Booking",
  },
  {
    label: "3rd Installment",
    percent: "5%",
    sublabel: "12 Months After Booking",
  },
  {
    label: "4th Installment",
    percent: "5%",
    sublabel: "18 Months After Booking",
  },
  {
    label: "5th Installment",
    percent: "5%",
    sublabel: "24 Months After Booking",
  },
  {
    label: "Final Installment",
    percent: "60%",
    sublabel: "On Handover",
  },
];

export const PAYMENT_MILESTONE_COUNT = MILESTONES.length;

function milestoneFieldKey(milestoneNumber, fieldName) {
  return `milestone-${milestoneNumber}-${fieldName}`;
}

export const PAYMENT_FIELDS = [
  {
    key: "heading",
    label: "Heading",
    type: "TEXT",
    defaultValue: "Duis Aute Irure Dolor In Reprehenderit",
  },
  {
    key: "text",
    label: "Intro text",
    type: "TEXT",
    long: true,
    defaultValue:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    key: "image",
    label: "Image",
    type: "IMAGE",
    helperText: "Recommended: 1920×1200px or taller. Panel height follows the payment table, so a tall image crops best.",
    defaultValue: "/images/payment/payment-plan.avif",
  },
  {
    key: "image-alt",
    label: "Image alt text",
    type: "TEXT",
    defaultValue: "[Add alt text for Movenpick lifestyle image]",
  },

  ...MILESTONES.flatMap((milestone, index) => {
    const milestoneNumber = index + 1;

    return [
      {
        key: milestoneFieldKey(milestoneNumber, "label"),
        label: `Milestone ${milestoneNumber} — Label`,
        type: "TEXT",
        defaultValue: milestone.label,
      },
      {
        key: milestoneFieldKey(milestoneNumber, "percent"),
        label: `Milestone ${milestoneNumber} — Percentage`,
        type: "TEXT",
        defaultValue: milestone.percent,
      },
      {
        key: milestoneFieldKey(milestoneNumber, "sublabel"),
        label: `Milestone ${milestoneNumber} — Sub-label`,
        type: "TEXT",
        defaultValue: milestone.sublabel,
      },
    ];
  }),
];

export function shapePaymentContent(content) {
  const milestones = Array.from({ length: PAYMENT_MILESTONE_COUNT }, (_, index) => {
    const milestoneNumber = index + 1;

    return {
      label: content[milestoneFieldKey(milestoneNumber, "label")],
      percent: content[milestoneFieldKey(milestoneNumber, "percent")],
      sublabel: content[milestoneFieldKey(milestoneNumber, "sublabel")],
    };
  });

  return {
    heading: content.heading,
    text: content.text,
    image: content.image,
    imageAlt: content["image-alt"],
    milestones,
  };
}
