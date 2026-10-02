import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import {
  NAVIGATION_FIELDS,
  shapeNavigationContent,
  shapeHeaderCta,
} from "@/content/sections/navigation";
import { APPEARANCE_FIELDS } from "@/content/sections/appearance";
import HeaderClient from "./HeaderClient";

export default async function Header() {
  const navigationContent = await getSectionContent(
    "navigation",
    buildDefaultsFromFields(NAVIGATION_FIELDS),
  );

  const appearanceContent = await getSectionContent(
    "appearance",
    buildDefaultsFromFields(APPEARANCE_FIELDS),
  );

  const menuItems = shapeNavigationContent(navigationContent);
  const headerCta = shapeHeaderCta(navigationContent);

  /*
   * The header recolours the logo with CSS mask-image (Header.module.css),
   * which refuses a cross-origin image unless its host sends a CORS header
   * — unlike an ordinary <img>, which this restriction does not apply to at
   * all. The bundled default logo is same-origin (a local /logos/ path) and
   * never needed this; a real logo uploaded through the panel is served
   * from the admin panel's own storage host, genuinely cross-origin. Routed
   * through this site's own /api/logo (see that route) so the browser only
   * ever sees a same-origin URL, regardless of what the storage host's own
   * CORS configuration does or doesn't allow.
   */
  const logoUrl = appearanceContent.logo?.startsWith("http")
    ? "/api/logo"
    : appearanceContent.logo;

  return (
    <HeaderClient
      menuItems={menuItems}
      logoUrl={logoUrl}
      ctaLabel={headerCta.label}
      ctaHref={headerCta.href}
    />
  );
}
