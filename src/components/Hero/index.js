import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { fieldDefault } from "@/lib/section-defaults";
import { HERO_FIELDS } from "@/content/sections/hero";
import HeroClient from "./HeroClient";

export default async function Hero() {
  const content = await getSectionContent(
    "hero",
    buildDefaultsFromFields(HERO_FIELDS),
  );

  return (
    <HeroClient
      mainImage={content["main-image"]}
      mainImageFallback={fieldDefault(HERO_FIELDS, "main-image")}
      mainImageAlt={content["main-image-alt"]}
      eyebrow={content.eyebrow}
      heading={content.heading}
      text={content.text}
      ctaLabel={content["cta-label"]}
      ctaHref={content["cta-href"]}
      ctaIcon={content["cta-icon"]}
    />
  );
}
