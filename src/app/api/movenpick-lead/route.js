import { dispatchLead } from "@/lib/lead-dispatch";

/*
 * Contact form, contact popup, and chat widget submissions.
 *
 * All the delivery logic lives in dispatchLead: the admin panel's Leads
 * section, Zoho (webhook and/or CRM), and Zapier, run concurrently, with the
 * visitor only seeing a failure when every configured destination failed.
 * This route just decides what kind of submission it is and turns the result
 * into an HTTP response.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    /*
     * The Contact section, ContactPopup, and the Chat widget's qualification
     * flow all post here, but only the chat payload includes `consent` —
     * that's the one reliable way to tell them apart from the body alone,
     * since neither form sends an explicit source field.
     */
    const source = body?.consent !== undefined ? "chat" : "contact";

    const { rateLimited, retryAfterSeconds, delivered } = await dispatchLead({
      source,
      body,
      requestHeaders: request.headers,
      zapierUrl: process.env.ZAPIER_MOVENPICK_LEAD_WEBHOOK,
    });

    if (rateLimited) {
      return Response.json(
        {
          success: false,
          message: "Too many submissions. Please try again shortly.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds ?? 600) },
        },
      );
    }

    if (!delivered) {
      return Response.json(
        {
          success: false,
          message: "We could not submit your enquiry. Please try again.",
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        success: true,
        reference: `MVP-${Date.now()}`,
        message: "Lead received successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    /*
     * error.message only. A JSON parse failure includes the offending input,
     * which for this endpoint is a visitor's name, email, and phone.
     */
    console.error("Movenpick lead API error:", error?.message);

    return Response.json(
      { success: false, message: "Invalid lead submission." },
      { status: 400 },
    );
  }
}
