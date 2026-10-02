import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { PROJECT_FIELDS } from "@/content/sections/project";
import ProjectClient from "./ProjectClient";

export default async function Project() {
  const content = await getSectionContent(
    "project",
    buildDefaultsFromFields(PROJECT_FIELDS),
  );

  return (
    <ProjectClient
      eyebrow={content.eyebrow}
      title={content.title}
      buttonLabel={content["button-label"]}
      brochureUrl={content["brochure-url"]}
      description={content.description}
      location={content.location}
      buildingImage={content["building-image"]}
      buildingImageAlt={content["building-image-alt"]}
      landscapeImage={content["landscape-image"]}
      landscapeImageAlt={content["landscape-image-alt"]}
      portraitImage={content["portrait-image"]}
      portraitImageAlt={content["portrait-image-alt"]}
    />
  );
}
