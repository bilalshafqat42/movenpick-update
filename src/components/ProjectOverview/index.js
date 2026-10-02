import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { PROJECT_OVERVIEW_FIELDS } from "@/content/sections/projectOverview";
import ProjectOverviewClient from "./ProjectOverviewClient";

export default async function ProjectOverview() {
  const content = await getSectionContent(
    "projectOverview",
    buildDefaultsFromFields(PROJECT_OVERVIEW_FIELDS),
  );

  const stats = [1, 2, 3, 4].map((n) => ({
    value: content[`stat-${n}-value`],
    label: content[`stat-${n}-label`],
  }));

  return (
    <ProjectOverviewClient
      description={content.description}
      stats={stats}
      cta1Label={content["cta-1-label"]}
      cta1Href={content["cta-1-href"]}
      cta2Label={content["cta-2-label"]}
      /*
       * Routed through /api/brochure when the file is genuinely
       * cross-origin. The link's `download` attribute is same-origin
       * only, so a CDN-hosted brochure would open in the browser
       * instead of downloading. See src/app/api/brochure/route.js.
       */
      cta2Href={
        content["cta-2-href"]?.startsWith("http")
          ? "/api/brochure"
          : content["cta-2-href"]
      }
    />
  );
}
