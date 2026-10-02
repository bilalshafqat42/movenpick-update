import "server-only";

import { describeLead } from "@/lib/lead-normalise";

/*
 * Zoho delivery, in two independent modes. Configure whichever you have;
 * both can run at once.
 *
 * 1. WEBHOOK  (ZOHO_WEBHOOK_URL)
 *    A plain JSON POST to a URL. This is what a Zoho Flow webhook trigger
 *    gives you, and it is by far the simpler option: no OAuth, no token
 *    expiry, and the field mapping lives in Flow where a non-developer can
 *    change it. Recommended unless you specifically need records created
 *    directly in CRM.
 *
 * 2. CRM API  (ZOHO_CRM_CLIENT_ID / _SECRET / _REFRESH_TOKEN)
 *    Creates a record in the CRM Leads module directly. Needs a
 *    self-client OAuth app in the Zoho API console and a refresh token
 *    generated once, offline.
 *
 * IMPORTANT, PLEASE VERIFY: the CRM field mapping below reflects the
 * standard Leads module, where `Last_Name` is mandatory and `Company` is
 * mandatory in a default setup. Your instance may differ — required fields
 * are configurable per organisation, and a custom mandatory field will make
 * Zoho reject the record. Check Setup -> Modules -> Leads before relying on
 * this, and extend FIELD MAPPING below to match. Everything here has
 * fallbacks so a missing value never sends an empty mandatory field, but
 * fallbacks cannot invent a field this code does not know about.
 *
 * Never throws. A Zoho outage must not cost a lead: the caller treats a
 * false return as "this destination failed" and the visitor still succeeds
 * as long as any destination accepted the enquiry.
 */
const REQUEST_TIMEOUT_MS = 8000;

/*
 * Zoho runs regional data centres on different domains, and using the wrong
 * one fails with an authentication error rather than anything that points at
 * the real cause. Common values: com, eu, in, com.au, jp, ca, sa.
 */
function zohoDomain() {
  return process.env.ZOHO_DC?.trim() || "com";
}

/*
 * Base URLs, derived from the data centre by default but overridable.
 *
 * Overridable because Zoho sandbox and developer environments are served
 * from different hosts than production, so hardcoding the live ones makes it
 * impossible to point a staging deployment at a sandbox CRM. It also lets
 * the OAuth and record-creation flow be exercised end to end against a stub
 * in tests, rather than shipping an untested token-refresh path.
 */
function accountsBaseUrl() {
  return (
    process.env.ZOHO_ACCOUNTS_BASE_URL?.trim().replace(/\/+$/, "") ||
    `https://accounts.zoho.${zohoDomain()}`
  );
}

function apiBaseUrl() {
  return (
    process.env.ZOHO_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    `https://www.zohoapis.${zohoDomain()}`
  );
}

/* ------------------------------------------------------------------ */
/* Mode 1: webhook                                                     */
/* ------------------------------------------------------------------ */

export async function sendToZohoWebhook(lead) {
  const url = process.env.ZOHO_WEBHOOK_URL;

  if (!url) {
    return { configured: false, ok: false };
  }

  try {
    const secret = process.env.ZOHO_WEBHOOK_SECRET;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        /*
         * Optional shared secret so the Flow can reject anything that is
         * not us. A webhook URL alone is a bearer credential in a query
         * string, and those leak through logs and browser history.
         */
        ...(secret ? { "X-Movenpick-Secret": secret } : {}),
      },
      body: JSON.stringify(buildZohoPayload(lead)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      /*
       * Status only, never the response body. A misconfigured Flow can echo
       * the request back in its error text, which would put the visitor's
       * name, email, and phone into our logs via a system we do not
       * control.
       */
      console.error(
        "Zoho webhook responded with status:",
        response.status,
        response.statusText,
      );

      return { configured: true, ok: false };
    }

    return { configured: true, ok: true };
  } catch (error) {
    console.error("Zoho webhook request failed:", error?.message);

    return { configured: true, ok: false };
  }
}

/*
 * Flat, explicitly-named payload for the webhook. Deliberately not the raw
 * form body: Flow mappings are built by clicking fields in a UI, so a
 * payload whose keys change shape depending on which form submitted would
 * mean a mapping that works for the contact form and silently drops the
 * name for chat leads.
 */
function buildZohoPayload(lead) {
  return {
    site: process.env.SITE_KEY?.trim() || "movenpick",
    /*
     * Read from the chat's own raw submission (Chat.js's submitLead posts
     * `project: lead.project`, which is the real project-name.js CMS field
     * — see chatAgent.js), not a hardcoded literal. Only the chat widget
     * sends this today; a contact-form lead has no project of its own to
     * report, so this is simply absent there, same as before.
     */
    project: lead.raw?.project,
    source: lead.source,
    first_name: lead.firstName,
    last_name: lead.lastName,
    full_name: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    user_type: lead.userType,
    search_stage: lead.searchStage,
    unit_type: lead.unitType,
    budget_bracket: lead.budgetBracket,
    requested_slot: lead.slot,
    consent: lead.consent,
    language: lead.language,
    page_url: lead.pageUrl,
    submitted_at: lead.submittedAt,
    summary: describeLead(lead),
    ...lead.attribution,
  };
}

/* ------------------------------------------------------------------ */
/* Mode 2: CRM Leads API                                               */
/* ------------------------------------------------------------------ */

/*
 * Access tokens last about an hour, so exchanging the refresh token on every
 * submission would triple the latency of a form post and burn Zoho API
 * credits for nothing. Cached in module scope, which works because this runs
 * as a single long-lived process (see the numInstances note in render.yaml).
 * A second instance would simply hold its own token, which is harmless.
 */
let cachedToken = null;

function crmCredentials() {
  const clientId = process.env.ZOHO_CRM_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CRM_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_CRM_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return { clientId, clientSecret, refreshToken };
}

async function getAccessToken(credentials) {
  /*
   * Refreshed 60s before nominal expiry, so a token cannot expire in flight
   * between this check and Zoho receiving the request.
   */
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const params = new URLSearchParams({
    refresh_token: credentials.refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(
    `${accountsBaseUrl()}/oauth/v2/token?${params}`,
    {
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => ({}));

  /*
   * Zoho returns HTTP 200 with an `error` key for a bad refresh token
   * rather than a 4xx, so checking response.ok alone reports success on a
   * failed exchange and the real error surfaces later as an unexplained
   * 401 from the Leads call.
   */
  if (!response.ok || payload.error || !payload.access_token) {
    throw new Error(
      `token exchange failed (status ${response.status}, error ${
        payload.error ?? "none"
      })`,
    );
  }

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + (Number(payload.expires_in) || 3600) * 1000,
  };

  return cachedToken.value;
}

/*
 * FIELD MAPPING — adjust here to match your Zoho instance.
 *
 * Fallbacks exist for the two fields the standard Leads module treats as
 * mandatory, because Zoho rejects the whole record if either is blank, and
 * a rejected record means a lost enquiry:
 *
 *   Last_Name : real surname, else the full name, else a clear placeholder.
 *               "Website Enquiry" is deliberately obvious in a CRM list, so
 *               nobody mistakes it for a real surname.
 *   Company   : a real company for brokers, else "Individual" for private
 *               buyers, who genuinely have no company to give.
 */
function buildCrmRecord(lead) {
  return {
    Last_Name: lead.lastName || lead.fullName || "Website Enquiry",
    ...(lead.firstName ? { First_Name: lead.firstName } : {}),
    Company: lead.company || "Individual",
    ...(lead.email ? { Email: lead.email } : {}),
    ...(lead.phone ? { Phone: lead.phone } : {}),
    Lead_Source:
      process.env.ZOHO_LEAD_SOURCE?.trim() ||
      (lead.source === "chat" ? "Movenpick Website Chatbot" : "Movenpick Website"),
    Description: describeLead(lead),
  };
}

export async function sendToZohoCrm(lead) {
  const credentials = crmCredentials();

  if (!credentials) {
    return { configured: false, ok: false };
  }

  try {
    const accessToken = await getAccessToken(credentials);

    const response = await fetch(
      `${apiBaseUrl()}/crm/v6/Leads`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        body: JSON.stringify({ data: [buildCrmRecord(lead)] }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      },
    );

    const payload = await response.json().catch(() => ({}));
    const record = payload?.data?.[0];

    /*
     * A partial failure comes back as HTTP 202 with a per-record status, so
     * response.ok is not the whole answer: a validation error on the record
     * (a mandatory custom field, a duplicate rule) reports success at the
     * HTTP level while creating nothing. Only `status: "success"` on the
     * record itself means the lead exists in Zoho.
     */
    if (!response.ok || record?.status !== "success") {
      /*
       * `code` and `message` are Zoho's own error identifiers
       * (MANDATORY_NOT_FOUND, DUPLICATE_DATA, INVALID_DATA) and name the
       * field at fault, which is exactly what makes this debuggable. Their
       * `details` object can echo submitted values back, so it is left out.
       */
      console.error(
        "Zoho CRM rejected the lead:",
        `status ${response.status}`,
        record?.code ?? payload?.code ?? "no code",
        record?.message ?? payload?.message ?? "no message",
      );

      /*
       * An expired or revoked token invalidates the cache, so the next
       * submission fetches a fresh one instead of retrying a dead token
       * until someone notices.
       */
      if (response.status === 401) {
        cachedToken = null;
      }

      return { configured: true, ok: false };
    }

    return { configured: true, ok: true, id: record?.details?.id };
  } catch (error) {
    console.error("Zoho CRM request failed:", error?.message);

    return { configured: true, ok: false };
  }
}

/*
 * Exposed for tests, so a spec can assert token caching behaviour from a
 * known starting point rather than inheriting a token from an earlier test.
 */
export function __resetZohoTokenCache() {
  cachedToken = null;
}
