/*
 * Server-side checks for the two public lead endpoints.
 *
 * The forms and the chat widget already validate in the browser, but that
 * is a convenience for the visitor, not a control: anyone can POST straight
 * to /api/movenpick-lead with curl. Without these checks, whatever JSON
 * arrived was forwarded to Zoho, Zapier and the panel as-is — junk records,
 * multi-megabyte fields, and chat leads that had explicitly declined
 * consent all landed in the CRM.
 *
 * The rules deliberately mirror the LOOSEST client-side rule for each field
 * (the contact form accepts a one-letter first name, the chat wants two), so
 * a submission the real UI allows is never rejected here. Tightening a rule
 * means tightening the forms first.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s()-]{7,20}$/;

/*
 * Real payloads are well under 2 KB (a dozen short fields plus attribution).
 * 16 KB leaves generous headroom for long page URLs while still refusing to
 * parse and forward something enormous.
 */
export const MAX_BODY_BYTES = 16 * 1024;

// Longest legitimate value is a page URL with UTM parameters.
const MAX_FIELD_LENGTH = 2000;
const MAX_FIELDS = 50;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/*
 * Returns null when the body is acceptable, otherwise a short reason. The
 * reason is for logs only; the visitor gets a generic message, so nothing
 * here hints at which rule to work around.
 */
export function validateLeadRequest(source, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "body is not an object";
  }

  const entries = Object.entries(body);

  if (entries.length > MAX_FIELDS) {
    return "too many fields";
  }

  for (const [, value] of entries) {
    if (value !== null && typeof value === "object") {
      return "nested values are not accepted";
    }

    if (typeof value === "string" && value.length > MAX_FIELD_LENGTH) {
      return "field too long";
    }
  }

  if (!text(body.firstName ?? body.first_name)) {
    return "missing first name";
  }

  if (!text(body.lastName ?? body.last_name)) {
    return "missing last name";
  }

  if (!EMAIL_PATTERN.test(text(body.email))) {
    return "invalid email";
  }

  if (!PHONE_PATTERN.test(text(body.phone))) {
    return "invalid phone";
  }

  /*
   * Only the chat collects an explicit consent answer (see the route for how
   * a chat payload is recognised). A chat lead without a clear "yes" must not
   * reach the CRM: under UAE PDPL, a declined consent is a decision to
   * respect, not a missing field.
   */
  if (source === "chat" && body.consent !== true) {
    return "consent not given";
  }

  if (source === "slot" && !text(body.slotLabel ?? body.slot)) {
    return "missing slot";
  }

  return null;
}

/*
 * Reads and parses the request body with a size cap. Returns
 * { body } on success or { error, status } to send straight back.
 */
export async function readLeadBody(request) {
  const declared = Number(request.headers.get("content-length"));

  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return { error: "Request too large.", status: 413 };
  }

  const raw = await request.text();

  // content-length can be absent or wrong, so check what actually arrived.
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return { error: "Request too large.", status: 413 };
  }

  try {
    return { body: JSON.parse(raw) };
  } catch {
    return { error: "Invalid request.", status: 400 };
  }
}
