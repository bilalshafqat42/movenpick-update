import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { PROJECT_OVERVIEW_FIELDS } from "@/content/sections/projectOverview";

/*
 * Serves the panel-uploaded brochure through this site's own origin, as an
 * attachment.
 *
 * The download link already carries a `download` attribute, and locally it
 * works: the file is same-origin. It stops working the moment a real
 * brochure is uploaded, because the panel stores it on the media CDN and
 * the HTML spec makes `download` same-origin only — a browser silently
 * ignores it on a cross-origin href and navigates instead. That is the
 * reported "it opens the PDF rather than downloading it".
 *
 * Same fix, and same reasoning, as /api/logo: fetch it server-to-server,
 * where the browser's origin rules do not apply, and hand it back from this
 * origin. Content-Disposition then makes it an attachment regardless of
 * what the CDN says, so the outcome no longer depends on that CDN's
 * headers.
 *
 * Deliberately resolves the URL itself rather than accepting one as a query
 * parameter: a parameter would make this an open proxy for whatever URL a
 * request cared to name. This only ever fetches the one URL the site's own
 * CMS content already says is the brochure.
 */

const FILENAME = "movenpick-residences-brochure.pdf";

export async function GET() {
  const content = await getSectionContent(
    "projectOverview",
    buildDefaultsFromFields(PROJECT_OVERVIEW_FIELDS),
  );

  const brochureUrl = content["cta-2-href"];

  if (!brochureUrl || !brochureUrl.startsWith("http")) {
    /*
     * Nothing remote configured. The caller should not have been pointed
     * here in that case (see ProjectOverview/index.js), which links a
     * same-origin path directly — where `download` works on its own.
     */
    return new Response(null, { status: 404 });
  }

  let upstream;

  try {
    upstream = await fetch(brochureUrl, {
      signal: AbortSignal.timeout(15000),
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
      "Content-Type": upstream.headers.get("content-type") ?? "application/pdf",
      /*
       * The line that actually makes it download. Quoted, because the
       * filename is a constant here but the header's grammar treats an
       * unquoted string as a token — a space in it would silently truncate
       * the name.
       */
      "Content-Disposition": `attachment; filename="${FILENAME}"`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
