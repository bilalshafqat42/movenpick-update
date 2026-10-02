"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { hasConsent, subscribeToConsent } from "@/lib/cookieConsent";

function getAnalyticsConsent() {
  return hasConsent("analytics");
}

// See GoogleTagManagerClient's identical function for why this starts false
// rather than guessing: the server has no cookie to read consent from, and
// starting from "not allowed" is the direction that cannot leak an
// unconsented load.
function getServerSnapshot() {
  return false;
}

/*
 * The direct GA4 path, independent of Google Tag Manager — for whoever
 * would rather skip GTM's own dashboard entirely. See tracking.js's own
 * comment for why this and GoogleTagManagerClient must not both be pointed
 * at the same GA4 property at once: that would fire every pageview twice.
 *
 * No noscript fallback, same reasoning as GoogleTagManagerClient: a no-JS
 * visitor never ran the consent check this is gated on, so there is
 * nothing to fall back to that would not also bypass consent entirely.
 */
export default function GoogleAnalyticsClient({ measurementId }) {
  const allowed = useSyncExternalStore(
    subscribeToConsent,
    getAnalyticsConsent,
    getServerSnapshot,
  );

  /*
   * A GA4 measurement ID is always exactly this shape — "G-" followed by
   * alphanumerics. measurementId comes from a plain admin-editable TEXT
   * field, not sanitised HTML, and is about to be interpolated straight
   * into a <script> body as a string; refusing anything that is not this
   * shape is what stops a stray character from breaking out of that
   * string and running as script, not an escaping trick applied after
   * the fact — the same reasoning as GoogleTagManagerClient's own
   * GTM_ID_PATTERN check.
   */
  if (!measurementId || !allowed || !/^G-[A-Z0-9]+$/.test(measurementId)) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');`}
      </Script>
    </>
  );
}
