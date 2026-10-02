/*
 * The Floor Plan section: the Payment Plan's layout placed a second time
 * (see src/components/FloorPlan), with its own copy.
 *
 * Static on purpose: edited here, not in the admin panel.
 *
 * Everything below is still the Payment Plan's content, copied as the
 * starting point. Replace it with the floor plan details: the heading,
 * intro, photo, the two column names, and one row per line of the table
 * (add or remove rows freely; the table follows the list).
 */
export const FLOOR_PLAN_CONTENT = {
  heading: "Floor Plan",
  text: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  image: "/images/payment/payment-plan.avif",
  imageAlt: "[Add alt text for the floor plan image]",
  columnLabels: ["Milestone", "%"],
  rows: [
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
  ],
};
