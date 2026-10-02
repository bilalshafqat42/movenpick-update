import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { COOKIES_FIELDS } from "@/content/sections/cookies";
import CookieConsentClient from "./CookieConsentClient";

export default async function CookieConsent() {
  const content = await getSectionContent(
    "cookies",
    buildDefaultsFromFields(COOKIES_FIELDS),
  );

  /*
   * Order matters: necessary first, so the thing the visitor has no say
   * over is stated before the things they do.
   */
  const categories = [
    {
      key: "necessary",
      title: content["necessary-title"],
      body: content["necessary-body"],
    },
    {
      key: "analytics",
      title: content["analytics-title"],
      body: content["analytics-body"],
    },
    {
      key: "marketing",
      title: content["marketing-title"],
      body: content["marketing-body"],
    },
  ];

  return (
    <CookieConsentClient
      title={content.title}
      body={content.body}
      acceptLabel={content["accept-label"]}
      rejectLabel={content["reject-label"]}
      manageLabel={content["manage-label"]}
      saveLabel={content["save-label"]}
      categories={categories}
      privacyLabel={content["privacy-label"]}
      privacyHref={content["privacy-href"]}
    />
  );
}
