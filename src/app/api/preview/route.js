import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { PREVIEW_TOKEN_COOKIE, PREVIEW_TOKEN_MAX_AGE_SECONDS } from "@/lib/preview-mode";

/*
 * Turns the panel's preview link into a real, rendered page — the piece
 * that was missing before this: the panel could already issue a signed
 * token, but nothing on this site knew what to do with one. Enables Next's
 * own draftMode() (which is what makes the homepage render fresh on every
 * request instead of serving a cached/static copy while active) and stores
 * the actual token in its own cookie, since draftMode's cookie only ever
 * carries an on/off flag.
 *
 * Deliberately does not verify the token itself — that check already
 * happens, correctly, server-side on the panel when /api/content is asked
 * for draft content (src/app/api/content/route.js there). Duplicating it
 * here would only be able to check the token's shape, not whether it is
 * genuinely valid for this site, since the signing key lives on the
 * panel's side. An invalid or expired token still enables draft mode, but
 * content.js's own fetch falls back to published content when the panel
 * rejects it — the same fail-open behaviour a bad preview link has
 * everywhere else.
 */
export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return new Response("Missing preview token.", { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();

  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PREVIEW_TOKEN_MAX_AGE_SECONDS,
  });

  redirect("/");
}
