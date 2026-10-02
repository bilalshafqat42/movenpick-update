import { dispatchLead } from "@/lib/lead-dispatch";
import { readLeadBody, validateLeadRequest } from "@/lib/validation/leadRequest";

/*
 * Viewing-slot bookings from the chat widget.
 *
 * Same delivery path as a normal enquiry (see dispatchLead), with two
 * differences: the source is "slot", which keeps these on their own
 * rate-limit budget so a visitor who has just sent an enquiry is not blocked
 * from booking a viewing, and a separate Zapier webhook, since a booking
 * usually triggers different automation from a general enquiry.
 */
export async function POST(request) {
  try {
    const parsed = await readLeadBody(request);

    if (parsed.error) {
      return Response.json(
        { success: false, message: parsed.error },
        { status: parsed.status },
      );
    }

    const { body } = parsed;

    const invalid = validateLeadRequest("slot", body);

    if (invalid) {
      // The reason only, never the body: it holds the visitor's details.
      console.warn("Rejected slot booking:", invalid);

      return Response.json(
        { success: false, message: "Invalid slot booking request." },
        { status: 400 },
      );
    }

    const { rateLimited, retryAfterSeconds, delivered } = await dispatchLead({
      source: "slot",
      body,
      requestHeaders: request.headers,
      zapierUrl: process.env.ZAPIER_MOVENPICK_SLOT_WEBHOOK,
    });

    if (rateLimited) {
      return Response.json(
        {
          success: false,
          message: "Too many booking attempts. Please try again shortly.",
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
          message: "We could not book that slot. Please try again.",
        },
        { status: 502 },
      );
    }

    return Response.json(
      { success: true, message: "Slot booked successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Movenpick slot booking API error:", error?.message);

    return Response.json(
      { success: false, message: "Invalid slot booking request." },
      { status: 400 },
    );
  }
}
