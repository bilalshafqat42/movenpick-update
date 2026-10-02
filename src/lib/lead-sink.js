import "server-only";

import { CLIENT_IP_HEADER, leadRateLimitBucket } from "@/lib/lead-contract";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { getSiteKey } from "@/lib/site-key";

export { CLIENT_IP_HEADER };

/*
 * Where a submitted enquiry goes. Called by both public form endpoints
 * (/api/movenpick-lead and /api/movenpick-lead-slot).
 *
 * This app has no database, so storage lives in the central admin panel.
 * Two things happen to every submission, independently:
 *
 *   1. it is forwarded here, to the panel's intake endpoint, and
 *   2. the calling route forwards it to Zapier.
 *
 * The visitor is only told the submission failed when BOTH fail. That
 * redundancy is deliberate and it is the reason this app can depend on the
 * panel without putting the sales pipeline at risk: if the panel is down,
 * mid-deploy, or not yet connected, enquiries still reach the team through
 * Zapier and the visitor sees a normal success.
 *
 * Never throws.
 */
const REQUEST_TIMEOUT_MS = 5000;

export async function persistLead(source, body, requestHeaders) {
  const clientIp = getClientIp(requestHeaders);

  /*
   * Rate limiting is applied HERE, locally, rather than being delegated to
   * the panel as it was while a shared database existed.
   *
   * It has to be local now for two reasons. The panel may not be
   * configured at all, in which case delegating would mean no limit on a
   * public unauthenticated endpoint that fires an outbound webhook — a
   * free spam relay. And even when the panel is configured, forwarding a
   * flood to it before deciding to reject means the flood still costs a
   * request to another service per attempt.
   */
  const limitState = checkRateLimit(
    leadRateLimitBucket(source, clientIp),
    RATE_LIMITS.publicForm,
  );

  if (!limitState.allowed) {
    return {
      saved: false,
      rateLimited: true,
      retryAfterSeconds: limitState.retryAfterSeconds,
    };
  }

  const baseUrl = process.env.LEAD_API_URL;

  /*
   * No panel configured yet. Not an error: the calling route still forwards
   * to Zapier, so the enquiry reaches the sales team. Logged at info level
   * because during the migration window this is the expected state, and an
   * error-level line here would train everyone to ignore the log.
   */
  if (!baseUrl) {
    return { saved: false, rateLimited: false, noSinkConfigured: true };
  }

  const token = process.env.LEAD_INTAKE_TOKEN;

  if (!token) {
    console.error(
      "LEAD_API_URL is set but LEAD_INTAKE_TOKEN is not — enquiries cannot be stored in the admin panel. Check this service's environment variables.",
    );

    return { saved: false, rateLimited: false };
  }

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/api/leads/intake`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          /*
           * The panel needs the visitor's IP, not this server's, if it
           * wants to do any per-visitor accounting of its own.
           */
          [CLIENT_IP_HEADER]: clientIp,
        },
        /*
         * `site` tells the multi-site panel which landing page this
         * enquiry came from. Without it, leads from every site it manages
         * land in one undifferentiated pile and the sales team cannot tell
         * which property a caller is asking about.
         */
        body: JSON.stringify({ site: getSiteKey(), source, body }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      },
    );

    if (response.status === 429) {
      return {
        saved: false,
        rateLimited: true,
        retryAfterSeconds: Number.parseInt(
          response.headers.get("retry-after") ?? "600",
          10,
        ),
      };
    }

    if (!response.ok) {
      /*
       * Status only, never the response body. A misconfigured endpoint can
       * echo the request back in its error text, which would put the
       * visitor's name, email, and phone into our logs.
       */
      console.error(
        "Lead intake responded with status:",
        response.status,
        response.statusText,
      );

      return { saved: false, rateLimited: false };
    }

    const result = await response.json().catch(() => ({}));

    return { saved: Boolean(result?.saved), rateLimited: false };
  } catch (error) {
    /*
     * Timeout, DNS failure, connection refused. Reported as not-saved
     * rather than thrown, so the caller falls through to Zapier and the
     * visitor's enquiry is still captured.
     */
    console.error("Lead intake request failed:", error?.message);

    return { saved: false, rateLimited: false };
  }
}
