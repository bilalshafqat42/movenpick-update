import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { CONTACT_FIELDS } from "@/content/sections/contact";
import ContactPopupClient from "./ContactPopupClient";

/*
 * Shares the "contact" section with the inline Contact component — see
 * src/admin/sections/contact.js for why.
 */
export default async function ContactPopup() {
  const content = await getSectionContent(
    "contact",
    buildDefaultsFromFields(CONTACT_FIELDS),
  );

  return (
    <ContactPopupClient
      eyebrow={content.eyebrow}
      heading={content.heading}
      submitButtonLabel={content["submit-button-label"]}
    />
  );
}
