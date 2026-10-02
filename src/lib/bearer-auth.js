import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/*
 * Shared `Authorization: Bearer <token>` check for the service-to-service
 * endpoints introduced when the admin panel and the public site split
 * into two deployments (the content API, the lead intake endpoint, the
 * revalidation webhook, and the two cron jobs).
 *
 * Compared via SHA-256 digests rather than `===`:
 *
 * - timingSafeEqual() requires both buffers to be the same length, and
 *   throws otherwise. Hashing first makes every comparison exactly 32
 *   bytes, so a wrong-length token takes the same path as a wrong-value
 *   one instead of being rejected early (which would leak the expected
 *   token's length).
 * - A plain `===` on strings short-circuits at the first differing byte.
 *   Over a network that difference is small, but this is the only thing
 *   standing between the public internet and the customer lead table, so
 *   there is no reason to hand out the measurement for free. The same
 *   reasoning already applied to the login timing fix in Phase 4.11.
 */
function digest(value) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function bearerTokenMatches(authorizationHeader, expectedToken) {
  /*
   * An unset expected token must never authorise anything. Without this,
   * a service deployed with a missing environment variable would treat
   * `Bearer undefined` as valid and expose the endpoint to anyone —
   * the callers below turn this into a 500 so a misconfiguration is
   * loud rather than silently open.
   */
  if (!expectedToken) {
    return false;
  }

  if (typeof authorizationHeader !== "string") {
    return false;
  }

  const prefix = "Bearer ";

  if (!authorizationHeader.startsWith(prefix)) {
    return false;
  }

  const presented = authorizationHeader.slice(prefix.length);

  return timingSafeEqual(digest(presented), digest(expectedToken));
}

/*
 * Wraps the check above into the response shape every one of these
 * endpoints wants: `null` when the caller is authorised, otherwise the
 * exact Response to return.
 *
 * A missing secret is a 500, not a 401, because the two mean different
 * things to whoever is debugging: 401 says "your token is wrong", 500
 * says "this service is misconfigured and no token would work".
 */
export function requireBearer(request, expectedToken, secretName) {
  if (!expectedToken) {
    console.error(`${secretName} is not configured — refusing all requests.`);

    return Response.json(
      { error: `${secretName} is not configured on this service.` },
      { status: 500 },
    );
  }

  if (!bearerTokenMatches(request.headers.get("authorization"), expectedToken)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
