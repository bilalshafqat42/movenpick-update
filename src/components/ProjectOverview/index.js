import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { PROJECT_OVERVIEW_FIELDS } from "@/content/sections/projectOverview";
import ProjectOverviewClient from "./ProjectOverviewClient";

/*
 * Hardcoded on purpose: this paragraph is static copy and must not be
 * overridden by the admin panel's "description" field.
 */
const DESCRIPTION =
  "Mövenpick Residences Dubai Motor City offers wellness-focused, furnished studios and 1–2BR apartments with views of Arabian Ranches, the skyline, and Motor City.";

/*
 * Rendered twice on the homepage: once under the hero, and again further
 * down as a full-screen `standalone` copy (see page.js). The standalone
 * one takes its own id and skips the ride over the hero's pinned photo,
 * which only makes sense directly beneath the hero.
 *
 * `description` and `intro` let a copy show its own heading and a line
 * beneath it; left out, it shows the original DESCRIPTION above.
 */
export default async function ProjectOverview({
  id,
  standalone = false,
  analyticsLocation,
  dayItems,
  description = DESCRIPTION,
  intro,
} = {}) {
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
      id={id}
      standalone={standalone}
      analyticsLocation={analyticsLocation}
      dayItems={dayItems}
      description={description}
      intro={intro}
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
