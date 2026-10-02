"use client";

import { hasConsent } from "@/lib/cookieConsent";

/*
 * Reports one real visitor action to GTM/GA4 — a contact form actually
 * submitted, a call or WhatsApp button actually clicked, a brochure
 * actually downloaded, the chat widget actually opened — as opposed to
 * just a pageview, which is all GoogleTagManagerClient's own script gives
 * you on its own.
 *
 * Gated on the same "analytics" consent category as the script that would
 * read this, not just left to queue: pushing a visitor's behaviour into
 * dataLayer before they have agreed to analytics is the same category of
 * problem as loading the script early would have been, even though
 * nothing would currently be listening on the other end.
 *
 * `window.dataLayer = window.dataLayer || []` is defensive, not optimistic
 * — this can run before or after GTM's own script has loaded (a visitor
 * can click something in the instant the page becomes interactive), and
 * GTM reads whatever is already in the array once it does load.
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window === "undefined") return;
  if (!hasConsent("analytics")) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
}
