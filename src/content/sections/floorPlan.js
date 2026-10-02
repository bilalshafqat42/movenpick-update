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
 *
 * `units` are the buttons under the intro. Choosing one shows its
 * `image` in the photo panel; every unit uses the same placeholder until
 * its own floor plan is added (e.g. "/images/floor-plan/studio.avif").
 */
export const FLOOR_PLAN_CONTENT = {
  heading: "Floor Plan",
  text: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  image: "/images/payment/payment-plan.avif",
  imageAlt: "[Add alt text for the floor plan image]",
  columnLabels: ["Milestone", "%"],
  units: [
    {
      label: "Studio",
      image: "/images/payment/payment-plan.avif",
      alt: "[Add alt text for the studio floor plan]",
    },
    {
      label: "1 Bedroom",
      image: "/images/payment/payment-plan.avif",
      alt: "[Add alt text for the 1 bedroom floor plan]",
    },
    {
      label: "2 Bedroom",
      image: "/images/payment/payment-plan.avif",
      alt: "[Add alt text for the 2 bedroom floor plan]",
    },
    {
      label: "3 Bedroom",
      image: "/images/payment/payment-plan.avif",
      alt: "[Add alt text for the 3 bedroom floor plan]",
    },
  ],
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
