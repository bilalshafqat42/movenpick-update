import { test } from "node:test";
import assert from "node:assert/strict";

import { normaliseLead, describeLead } from "@/lib/lead-normalise";
import { leadRateLimitBucket, CLIENT_IP_HEADER } from "@/lib/lead-contract";

/*
 * The three forms send different field names for the same data. Get this
 * wrong and enquiries still save, with an empty name column and nothing in
 * any log — the failure only surfaces when someone asks why half the leads in
 * the CRM are nameless.
 */

const CONTACT = {
  firstName: "Aisha",
  lastName: "Khan",
  email: "a@example.invalid",
  phone: "+971500000000",
  userType: "buyer",
  utm_source: "google",
  page_url: "https://oceara.refinedubai.com/?utm_source=google",
};

const CHAT = {
  first_name: "Omar",
  last_name: "Ali",
  email: "o@example.invalid",
  phone: "+971511111111",
  intent: "broker",
  search_stage: "actively_looking",
  unit_type: "studio",
  budget_bracket: "500k_1m",
  consent: true,
};

test("camelCase (contact form) and snake_case (chat) both yield a name", () => {
  assert.equal(normaliseLead("contact", CONTACT).firstName, "Aisha");
  assert.equal(normaliseLead("contact", CONTACT).lastName, "Khan");
  assert.equal(normaliseLead("chat", CHAT).firstName, "Omar");
  assert.equal(normaliseLead("chat", CHAT).lastName, "Ali");
});

test("userType, intent and role are the same question", () => {
  assert.equal(normaliseLead("contact", CONTACT).userType, "buyer");
  assert.equal(normaliseLead("chat", CHAT).userType, "broker");
  assert.equal(normaliseLead("chat", { role: "investor" }).userType, "investor");
});

test("chat qualification answers are carried through", () => {
  const lead = normaliseLead("chat", CHAT);
  assert.equal(lead.searchStage, "actively_looking");
  assert.equal(lead.unitType, "studio");
  assert.equal(lead.budgetBracket, "500k_1m");
});

test("consent distinguishes 'not asked' from 'declined'", () => {
  /*
   * Under UAE PDPL these are different facts: null means the form never asked,
   * false means the visitor actively declined. Collapsing them would fabricate
   * a refusal that never happened, or lose a real one.
   */
  assert.equal(normaliseLead("chat", { consent: true }).consent, true);
  assert.equal(normaliseLead("chat", { consent: false }).consent, false);
  assert.equal(normaliseLead("contact", CONTACT).consent, null);
});

test("campaign attribution is collected and empty keys omitted", () => {
  const lead = normaliseLead("contact", CONTACT);
  assert.equal(lead.attribution.utm_source, "google");
  assert.ok(!("gclid" in lead.attribution));
});

test("the raw body is always preserved so nothing is lost", () => {
  const lead = normaliseLead("chat", { first_name: "X", something_new: "keep me" });
  assert.equal(lead.raw.something_new, "keep me");
});

test("whitespace-only values are treated as absent", () => {
  assert.equal(normaliseLead("contact", { firstName: "   " }).firstName, "");
});

test("describeLead summarises qualification for a single notes field", () => {
  const summary = describeLead(normaliseLead("chat", CHAT));
  assert.match(summary, /Type: broker/);
  assert.match(summary, /Budget: 500k_1m/);
  assert.match(summary, /Consented to contact/);
});

test("slot bookings count against a SEPARATE rate-limit budget", () => {
  /*
   * A visitor who has just sent an enquiry must not find the "book a viewing"
   * button rate-limited as a result. Sharing one bucket would block the
   * higher-intent action.
   */
  const ip = "203.0.113.10";
  assert.notEqual(leadRateLimitBucket("slot", ip), leadRateLimitBucket("contact", ip));
  assert.equal(leadRateLimitBucket("contact", ip), leadRateLimitBucket("chat", ip));
});

test("the client IP header name is the one the panel is told to read", () => {
  assert.equal(CLIENT_IP_HEADER, "x-oceara-client-ip");
});
