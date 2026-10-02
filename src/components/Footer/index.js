import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { FOOTER_FIELDS } from "@/content/sections/footer";
import { APPEARANCE_FIELDS } from "@/content/sections/appearance";
import FooterClient from "./FooterClient";

export default async function Footer() {
  const content = await getSectionContent(
    "footer",
    buildDefaultsFromFields(FOOTER_FIELDS),
  );

  /*
   * Reuses the same logo set in Appearance rather than a separate upload
   * field here, so an admin only ever has one place to update the logo.
   */
  const appearanceContent = await getSectionContent(
    "appearance",
    buildDefaultsFromFields(APPEARANCE_FIELDS),
  );

  // Same cross-origin mask-image requirement as the header logo — see
  // Header/index.js's comment and src/app/api/logo/route.js.
  const logoUrl = appearanceContent.logo?.startsWith("http")
    ? "/api/logo"
    : appearanceContent.logo;

  return (
    <FooterClient
      logoUrl={logoUrl}
      phoneDisplay={content["phone-display"]}
      phoneHref={content["phone-href"]}
      tollFreeDisplay={content["tollfree-display"]}
      tollFreeHref={content["tollfree-href"]}
      email={content.email}
      address={content.address}
      copyright={content.copyright}
      cookiesButtonLabel={content["cookies-button-label"]}
    />
  );
}
