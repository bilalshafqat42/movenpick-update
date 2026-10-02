/*
 * One canonical shape for a submitted enquiry, whichever form produced it.
 *
 * This exists because the three entry points send genuinely different field
 * names for the same information, all to the same endpoint:
 *
 *   Contact form / popup : firstName, lastName, userType   (camelCase)
 *   Chat widget          : first_name, last_name, intent   (snake_case)
 *   Slot booking         : its own mix, plus slot details
 *
 * Left unnormalised, every downstream destination has to know all three
 * dialects, and the failure when it does not is silent: the enquiry is
 * accepted, the record is created, and the name field is simply empty.
 * Nobody notices until someone asks why half the Zoho leads have no name.
 *
 * `raw` always carries the original body through untouched, so adding a
 * field to a form can never lose data even before this file knows about it.
 */

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

/*
 * Campaign attribution. The contact form sends a flat set of snake_case
 * UTM keys; the chat sends none. Collected into one object so a destination
 * can forward the lot without restating the list.
 */
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_referrer",
  "gclid",
  "fbclid",
  "msclkid",
  "page_url",
  "landing_page_url",
];

export function normaliseLead(source, body) {
  const raw = body ?? {};

  const firstName = firstNonEmpty(raw.firstName, raw.first_name);
  const lastName = firstNonEmpty(raw.lastName, raw.last_name);

  const attribution = {};

  for (const key of UTM_KEYS) {
    if (raw[key]) {
      attribution[key] = raw[key];
    }
  }

  return {
    source,
    firstName,
    lastName,
    fullName: firstNonEmpty(`${firstName} ${lastName}`.trim(), raw.name),
    email: firstNonEmpty(raw.email),
    phone: firstNonEmpty(raw.phone),
    company: firstNonEmpty(raw.company),

    /*
     * What kind of enquirer. The contact form calls this userType
     * ("buyer"/"broker"), the chat calls it intent, and an older payload
     * shape used role — all three are the same question.
     */
    userType: firstNonEmpty(raw.userType, raw.intent, raw.role),

    /*
     * Chat-only qualification answers, and the commercially interesting
     * part of a chat lead: how ready the person is, what size of unit, and
     * what they will spend.
     */
    searchStage: firstNonEmpty(raw.search_stage, raw.searchStage),
    unitType: firstNonEmpty(raw.unit_type, raw.unitType),
    budgetBracket: firstNonEmpty(raw.budget_bracket, raw.budgetBracket),

    /*
     * Slot bookings carry the chosen appointment. Kept as whatever the form
     * sent rather than parsed into a date here, because a half-understood
     * timezone conversion is worse than passing the original string on.
     */
    slot: firstNonEmpty(raw.slot, raw.slot_label, raw.appointment),

    /*
     * Explicit agreement to be contacted, sent by the chat. `null` rather
     * than `false` when absent, because "the form did not ask" and "the
     * visitor declined" are different facts and under UAE PDPL the
     * distinction is the one that matters.
     */
    consent: typeof raw.consent === "boolean" ? raw.consent : null,

    language: firstNonEmpty(raw.language) || "en",
    reference: firstNonEmpty(raw.reference),
    pageUrl: firstNonEmpty(raw.pageUrl, raw.page_url),
    submittedAt: firstNonEmpty(raw.submittedAt) || new Date().toISOString(),

    attribution,
    raw,
  };
}

/*
 * Human-readable one-liner of the qualification answers, for destinations
 * with a single free-text notes field (Zoho's Description, an email body)
 * rather than somewhere structured to put each answer.
 */
export function describeLead(lead) {
  const parts = [
    lead.userType && `Type: ${lead.userType}`,
    lead.searchStage && `Stage: ${lead.searchStage}`,
    lead.unitType && `Unit: ${lead.unitType}`,
    lead.budgetBracket && `Budget: ${lead.budgetBracket}`,
    lead.slot && `Requested slot: ${lead.slot}`,
    lead.language && lead.language !== "en" && `Language: ${lead.language}`,
    lead.consent === true && "Consented to contact",
    lead.pageUrl && `Page: ${lead.pageUrl}`,
  ].filter(Boolean);

  return parts.join(" | ");
}
