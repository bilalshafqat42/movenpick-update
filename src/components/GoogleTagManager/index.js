import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { INTEGRATIONS_FIELDS } from "@/content/sections/integrations";
import GoogleTagManagerClient from "./GoogleTagManagerClient";
import GoogleAnalyticsClient from "./GoogleAnalyticsClient";

/*
 * Both read from the "integrations" section (Search Console verification
 * lives there too, but is rendered directly by layout.js's own metadata,
 * not through this component). Both fields here are independently optional
 * — either can be empty, set, or (deliberately unusual) both set at once
 * for two unrelated GA4 properties. See integrations.js's own comment for
 * the one combination to avoid: the same GA4 property configured in both
 * places at once, which would double-count.
 */
export default async function GoogleTagManager() {
  const content = await getSectionContent(
    "integrations",
    buildDefaultsFromFields(INTEGRATIONS_FIELDS),
  );

  return (
    <>
      <GoogleTagManagerClient containerId={content["gtm-container-id"]} />
      <GoogleAnalyticsClient measurementId={content["ga4-measurement-id"]} />
    </>
  );
}
