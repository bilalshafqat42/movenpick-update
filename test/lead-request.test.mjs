import { test } from "node:test";
import assert from "node:assert/strict";

import { validateLeadRequest } from "@/lib/validation/leadRequest";

const contact = {
  firstName: "A",
  lastName: "Placeholder",
  userType: "buyer",
  phone: "+971500000000",
  email: "person@example.com",
  utm_source: "google",
};

const chat = {
  first_name: "Test",
  last_name: "Placeholder",
  phone: "+971500000000",
  email: "person@example.com",
  consent: true,
};

const slot = {
  reference: "MVP-1",
  slotLabel: "Monday 10:00",
  firstName: "Test",
  lastName: "Placeholder",
  phone: "+971500000000",
  email: "person@example.com",
};

test("real payloads from each form are accepted", () => {
  assert.equal(validateLeadRequest("contact", contact), null);
  assert.equal(validateLeadRequest("chat", chat), null);
  assert.equal(validateLeadRequest("slot", slot), null);
});

test("a one-letter first name is accepted, matching the contact form", () => {
  assert.equal(validateLeadRequest("contact", { ...contact, firstName: "A" }), null);
});

test("non-object bodies are rejected", () => {
  for (const body of [null, "text", 42, [contact]]) {
    assert.ok(validateLeadRequest("contact", body));
  }
});

test("missing or malformed contact details are rejected", () => {
  assert.ok(validateLeadRequest("contact", { ...contact, firstName: " " }));
  assert.ok(validateLeadRequest("contact", { ...contact, lastName: undefined }));
  assert.ok(validateLeadRequest("contact", { ...contact, email: "not-an-email" }));
  assert.ok(validateLeadRequest("contact", { ...contact, phone: "abc" }));
});

test("a chat lead without explicit consent is rejected", () => {
  assert.ok(validateLeadRequest("chat", { ...chat, consent: false }));
  assert.ok(validateLeadRequest("chat", { ...chat, consent: "true" }));
});

test("a slot booking without a slot is rejected", () => {
  assert.ok(validateLeadRequest("slot", { ...slot, slotLabel: "" }));
});

test("oversized and nested values are rejected", () => {
  assert.ok(validateLeadRequest("contact", { ...contact, utm_term: "x".repeat(2001) }));
  assert.ok(validateLeadRequest("contact", { ...contact, extra: { a: 1 } }));
});
