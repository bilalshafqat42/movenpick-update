import { revalidatePath, revalidateTag } from "next/cache";

import { requireBearer } from "@/lib/bearer-auth";
import { CONTENT_CACHE_TAG } from "@/lib/content-api";

/*
 * Revalidation webhook. Lives on the public site and is called by the
 * admin service's saveSectionAction immediately after a successful save.
 *
 * Why this endpoint has to exist: while both halves ran in one process,
 * saveSectionAction could simply call revalidatePath() itself and the
 * public pages it invalidated were its own. Across two services that
 * call now invalidates the admin service's cache, which nobody reads,
 * and leaves the public site serving whatever it cached. The webhook is
 * how the write side reaches the read side's cache.
 *
 * Preserving "edits show up immediately" is the point — that is a stated
 * property of this admin panel, not a nice-to-have, so both calls below
 * are chosen for immediacy over cheapness.
 */
export async function POST(request) {
  const unauthorized = requireBearer(
    request,
    process.env.REVALIDATE_SECRET,
    "REVALIDATE_SECRET",
  );

  if (unauthorized) {
    return unauthorized;
  }

  try {
    /*
     * `{ expire: 0 }` rather than the recommended "max" profile, and the
     * difference matters here. "max" is stale-while-revalidate: the next
     * visitor is served the OLD content while fresh content loads behind
     * them. For an editor who just clicked Save and is reloading the site
     * to check their work, that reads as "my change did not save" —
     * exactly the failure this panel is supposed to avoid. Expiring
     * immediately makes the next read block briefly and return fresh
     * content instead.
     *
     * updateTag() would be the documented way to express this, but it can
     * only be called from a Server Action, and this is a Route Handler
     * because the caller is another service rather than a form.
     */
    revalidateTag(CONTENT_CACHE_TAG, { expire: 0 });

    /*
     * The tag above covers the content fetch itself. This covers the
     * rendered route cache, including the separate /robots.txt and /icon
     * entries that a plain revalidatePath("/") does not touch — the same
     * reasoning (and the same fix) as the original in-process call this
     * webhook replaces.
     */
    revalidatePath("/", "layout");

    return Response.json({ revalidated: true });
  } catch (error) {
    console.error("Revalidation failed:", error?.message);

    return Response.json({ error: "Revalidation failed." }, { status: 500 });
  }
}
