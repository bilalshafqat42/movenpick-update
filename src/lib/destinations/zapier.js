import "server-only";

/*
 * Zapier webhook forward.
 *
 * Extracted from the two lead routes, which each carried their own
 * copy-pasted version of this function — identical apart from the
 * environment variable and the log wording. Kept as a destination in its own
 * right so an existing Zap keeps working while Zoho is being set up, and can
 * then be switched off by clearing its URL rather than by a code change.
 *
 * Never throws.
 */
const REQUEST_TIMEOUT_MS = 8000;

export async function sendToZapier(webhookUrl, body) {
  if (!webhookUrl) {
    return { configured: false, ok: false };
  }

  try {
    const secret = process.env.ZAPIER_BOT_SECRET;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { "X-Bot-Secret": secret } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      /*
       * Status only, never the response body. A misconfigured Zap can echo
       * the request it received back in its error text, which would put the
       * visitor's name, email, and phone into our server logs via a system
       * we do not control.
       */
      console.error(
        "Zapier webhook responded with status:",
        response.status,
        response.statusText,
      );

      return { configured: true, ok: false };
    }

    return { configured: true, ok: true };
  } catch (error) {
    console.error("Zapier webhook request failed:", error?.message);

    return { configured: true, ok: false };
  }
}
