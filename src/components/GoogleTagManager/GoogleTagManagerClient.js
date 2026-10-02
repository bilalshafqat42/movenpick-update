"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { hasConsent, subscribeToConsent } from "@/lib/cookieConsent";

function getAnalyticsConsent() {
  return hasConsent("analytics");
}

/*
 * The server has no cookie to read consent from — draftMode-style guessing
 * would either flash the tag in for a visitor who declined or, worse, never
 * load it for one who already accepted until a client re-render. Starting
 * from "not allowed" and only turning on once the client confirms consent is
 * the direction that cannot leak an unconsented load.
 */
function getServerSnapshot() {
  return false;
}

/*
 * Loads Google Tag Manager, and only Google Tag Manager — GA4 is added as a
 * tag inside the GTM container's own dashboard, not as separate code here.
 *
 * No noscript fallback, unlike Google's own standard snippet. That fallback
 * is an unconditional hidden iframe with no way to gate it on consent, since
 * a no-JS visitor never ran the consent check that this whole component is
 * built around — including it would mean the one visitor with no way to
 * ever grant consent is also the one for whom analytics cannot be switched
 * off. Omitting it is the correct default-off behaviour for that visitor,
 * not a missing feature.
 */
/*
 * A GTM container ID is always exactly this shape — "GTM-" followed by
 * alphanumerics. containerId comes from a plain admin-editable TEXT field,
 * not sanitised HTML, and it is about to be interpolated straight into a
 * <script> body as a string; refusing anything that is not this shape is
 * what stops a stray character from breaking out of that string and
 * running as script, not an escaping trick applied after the fact.
 */
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export default function GoogleTagManagerClient({ containerId }) {
  const allowed = useSyncExternalStore(
    subscribeToConsent,
    getAnalyticsConsent,
    getServerSnapshot,
  );

  if (!containerId || !allowed || !GTM_ID_PATTERN.test(containerId)) {
    return null;
  }

  return (
    <Script id="gtm-script" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`}
    </Script>
  );
}
