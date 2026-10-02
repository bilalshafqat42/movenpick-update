import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { APPEARANCE_FIELDS } from "@/content/sections/appearance";

/*
 * Serves the panel-uploaded logo through this site's own origin.
 *
 * Header.module.css recolours the logo with CSS mask-image, which — unlike
 * an ordinary <img>, which is unaffected — treats a cross-origin image as
 * tainted and refuses to use it unless that origin sends an
 * Access-Control-Allow-Origin header. The logo is genuinely cross-origin
 * (uploaded to the admin panel's R2 bucket, served from
 * media.refinedubai.com), so this has been a real requirement since the
 * mask-image technique was first written — it simply never mattered until a
 * real logo replaced the same-origin bundled default.
 *
 * Rather than depend on that CDN's CORS configuration (and its cache
 * correctly picking up a change to it), this route fetches the logo
 * server-to-server — where CORS does not apply at all, it is purely a
 * browser enforcement — and hands it back same-origin. The mask-image then
 * never crosses an origin in the browser's eyes, so nothing about R2 or
 * Cloudflare's configuration can break it again.
 *
 * Deliberately resolves the logo URL itself rather than accepting one as a
 * query parameter: a parameter would make this an open proxy for whatever
 * URL a request cared to name. This only ever fetches the one URL the
 * site's own CMS content already says is the logo.
 */

export async function GET() {
  const appearanceContent = await getSectionContent(
    "appearance",
    buildDefaultsFromFields(APPEARANCE_FIELDS),
  );

  const logoUrl = appearanceContent.logo;

  if (!logoUrl || !logoUrl.startsWith("http")) {
    // No remote logo configured — the caller should not have been pointed
    // here in that case (see Header/index.js), but failing with a plain 404
    // is the same "just don't show a logo" outcome a broken mask-image URL
    // already produces, not a new failure mode.
    return new Response(null, { status: 404 });
  }

  let upstream;
  try {
    upstream = await fetch(logoUrl, {
      signal: AbortSignal.timeout(5000),
      // This is the one request in the whole app that must not be cached by
      // fetch's own layer: it needs to always reflect whatever the panel's
      // content currently says, and the response below sets the real
      // browser-facing cache policy separately.
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/svg+xml",
      /*
       * Short-lived rather than immutable: unlike a hashed static asset,
       * this same URL keeps serving whatever the panel's logo field
       * currently holds, and a replaced logo should show up without
       * waiting a year for it.
       */
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
