import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { CONTACT_FIELDS } from "@/content/sections/contact";
import ContactClient from "./ContactClient";

export default async function Contact() {
  const content = await getSectionContent(
    "contact",
    buildDefaultsFromFields(CONTACT_FIELDS),
  );

  return (
    <ContactClient
      eyebrow={content.eyebrow}
      heading={content.heading}
      description={content.description}
      submitButtonLabel={content["submit-button-label"]}
    />
  );
}
