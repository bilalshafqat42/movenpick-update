import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { fieldDefault } from "@/lib/section-defaults";
import { SEA_SECTION_FIELDS } from "@/content/sections/seaSection";
import SeaSectionClient from "./SeaSectionClient";

export default async function SeaSection() {
  const content = await getSectionContent(
    "seaSection",
    buildDefaultsFromFields(SEA_SECTION_FIELDS),
  );

  return (
    <SeaSectionClient
      image={content.image}
      imageAlt={content["image-alt"]}
      imageFallback={fieldDefault(SEA_SECTION_FIELDS, "image")}
    />
  );
}
