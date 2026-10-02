/*
 * Shared between /api/preview (sets it), /api/preview/exit (clears it), and
 * content-api.js (reads it) — one name, so the three can never drift apart.
 *
 * Next's own draftMode() cookie only carries an on/off flag, not the actual
 * preview token the panel issued; this cookie is what carries the real
 * value, alongside draftMode's own cookie rather than instead of it, so the
 * homepage still gets draftMode's automatic "always render fresh, never
 * statically cache" behaviour for free.
 */
export const PREVIEW_TOKEN_COOKIE = "movenpick_preview_token";

// One hour, matching the panel's own preview-token TTL
// (src/lib/content/preview-token.mjs's default) — no reason for the
// cookie to outlive the token it carries.
export const PREVIEW_TOKEN_MAX_AGE_SECONDS = 60 * 60;
