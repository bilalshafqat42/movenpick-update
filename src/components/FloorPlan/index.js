import { FLOOR_PLAN_CONTENT } from "@/content/sections/floorPlan";
import PaymentClient from "@/components/Payment/PaymentClient";

/*
 * The Payment Plan's layout — photo on one side, table on the other —
 * reused as its own section with static content. Sharing PaymentClient
 * rather than copying it means both sections keep the same entrance
 * animation and responsive behaviour, and a fix to one fixes both.
 */
export default function FloorPlan() {
  const { heading, text, image, imageAlt, columnLabels, rows, units } =
    FLOOR_PLAN_CONTENT;

  return (
    <PaymentClient
      id="floor-plan"
      titleId="floor-plan-title"
      heading={heading}
      text={text}
      image={image}
      /*
       * No fallback photo: if a floor plan ever fails to load, showing a
       * lifestyle render in its place would be more misleading than an
       * empty panel.
       */
      imageFallback={null}
      imageAlt={imageAlt}
      milestones={rows}
      columnLabels={columnLabels}
      introInPanel
      units={units}
    />
  );
}
