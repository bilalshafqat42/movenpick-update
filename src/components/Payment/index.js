import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { fieldDefault } from "@/lib/section-defaults";
import {
  PAYMENT_FIELDS,
  shapePaymentContent,
} from "@/content/sections/payment";
import PaymentClient from "./PaymentClient";

export default async function Payment() {
  const content = await getSectionContent(
    "payment",
    buildDefaultsFromFields(PAYMENT_FIELDS),
  );

  const { heading, text, image, imageAlt, milestones } =
    shapePaymentContent(content);

  return (
    <PaymentClient
      heading={heading}
      text={text}
      image={image}
      imageFallback={fieldDefault(PAYMENT_FIELDS, "image")}
      imageAlt={imageAlt}
      milestones={milestones}
    />
  );
}
