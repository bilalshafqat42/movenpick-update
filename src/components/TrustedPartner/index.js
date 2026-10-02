import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { TRUSTED_PARTNER_FIELDS } from "@/content/sections/trustedPartner";
import TrustedPartnerClient from "./TrustedPartnerClient";

export default async function TrustedPartner() {
  const content = await getSectionContent(
    "trustedPartner",
    buildDefaultsFromFields(TRUSTED_PARTNER_FIELDS),
  );

  return (
    <TrustedPartnerClient
      logo={content.logo}
      logoAlt={content["logo-alt"]}
      label={content.label}
      heading={content.heading}
      text={content.text}
      image={content.image}
      imageAlt={content["image-alt"]}
      cardHeading={content["card-heading"]}
      cardText={content["card-text"]}
      ctaLabel={content["cta-label"]}
      ctaHref={content["cta-href"]}
    />
  );
}
