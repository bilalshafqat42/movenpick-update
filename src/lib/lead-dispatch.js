import "server-only";

import { persistLead } from "@/lib/lead-sink";
import { normaliseLead } from "@/lib/lead-normalise";
import { sendToZapier } from "@/lib/destinations/zapier";
import { sendToZohoCrm, sendToZohoWebhook } from "@/lib/destinations/zoho";

/*
 * Sends one submitted enquiry to every configured destination.
 *
 * Destinations, all independent and all optional:
 *
 *   admin panel  LEAD_API_URL            -> the backend Leads section
 *   Zoho webhook ZOHO_WEBHOOK_URL        -> Zoho Flow
 *   Zoho CRM     ZOHO_CRM_REFRESH_TOKEN  -> CRM Leads module
 *   Zapier       ZAPIER_*_WEBHOOK        -> existing Zaps
 *
 * TWO RULES, and both matter more than they look.
 *
 * 1. THEY RUN CONCURRENTLY. Sequentially, four destinations at up to 8s each
 *    could leave a visitor watching a spinner for half a minute before being
 *    told their enquiry went through. Run together, the wait is the slowest
 *    one rather than the sum, so adding a destination costs no extra latency.
 *
 * 2. ONE SURVIVOR IS ENOUGH. The visitor is told the submission failed only
 *    when EVERY configured destination failed. Any single destination being
 *    down, misconfigured, or mid-deploy must never turn a real enquiry into
 *    an error message, because the visitor does not retry — they leave, and
 *    the enquiry is gone. Redundancy across destinations is the whole point
 *    of having several.
 *
 * Rate limiting is decided inside persistLead and short-circuits everything:
 * a throttled request must not fire outbound webhooks, or the limiter would
 * protect our own storage while still letting a flood through to Zoho.
 */
export async function dispatchLead({ source, body, requestHeaders, zapierUrl }) {
  const lead = normaliseLead(source, body);

  /*
   * Awaited before the rest so a rate-limited submission reaches no
   * destination at all. It is the only check that can reject the request.
   */
  const panel = await persistLead(source, body, requestHeaders);

  if (panel.rateLimited) {
    return {
      rateLimited: true,
      retryAfterSeconds: panel.retryAfterSeconds,
      delivered: false,
    };
  }

  const [zohoWebhook, zohoCrm, zapier] = await Promise.all([
    sendToZohoWebhook(lead),
    sendToZohoCrm(lead),
    /*
     * Zapier receives the ORIGINAL body, not the normalised shape. Existing
     * Zaps have field mappings built against the current payload, and
     * quietly changing the keys underneath them would break live automations
     * that nobody is watching. New destinations get the clean shape; the
     * legacy one keeps its contract.
     */
    sendToZapier(zapierUrl, body),
  ]);

  const results = {
    panel: { configured: !panel.noSinkConfigured, ok: panel.saved },
    zohoWebhook,
    zohoCrm,
    zapier,
  };

  const configured = Object.values(results).filter((r) => r.configured);
  const succeeded = configured.filter((r) => r.ok);

  /*
   * With nothing configured at all, `delivered` is false and the route
   * returns an error — which is correct rather than pessimistic. An enquiry
   * that reached no destination has been lost, and reporting success would
   * hide that until someone asks why the leads stopped arriving.
   */
  const delivered = succeeded.length > 0;

  if (!delivered) {
    console.error(
      "Lead reached no destination.",
      `configured=${configured.length}`,
      Object.entries(results)
        .filter(([, r]) => r.configured)
        .map(([name]) => name)
        .join(",") || "none",
    );
  } else if (succeeded.length < configured.length) {
    /*
     * Logged as a warning rather than swallowed: the visitor was correctly
     * told it succeeded, but a destination is broken and somebody should
     * know before the one that still works also fails.
     */
    console.warn(
      "Lead delivered, but some destinations failed:",
      Object.entries(results)
        .filter(([, r]) => r.configured && !r.ok)
        .map(([name]) => name)
        .join(", "),
    );
  }

  return { rateLimited: false, delivered, results };
}
