import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import {
  AMENITIES_FIELDS,
  shapeAmenitiesContent,
} from "@/content/sections/amenities";
import AmenitiesClient from "./AmenitiesClient";

/*
 * Server Component boundary: fetches this section's content (falling
 * back to the hardcoded defaults in src/admin/sections/amenities.js for
 * anything not yet saved in the database), then hands off to the client
 * component for the interactive/animated rendering.
 */
export default async function Amenities() {
  const content = await getSectionContent(
    "amenities",
    buildDefaultsFromFields(AMENITIES_FIELDS),
  );

  const { heading, introText, items, ctaLabel } =
    shapeAmenitiesContent(content);

  return (
    <AmenitiesClient
      heading={heading}
      introText={introText}
      items={items}
      ctaLabel={ctaLabel}
    />
  );
}
