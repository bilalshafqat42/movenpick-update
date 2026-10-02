/*
 * The wire contract shared by the public site's form endpoints and the
 * admin service's lead intake endpoint.
 *
 * Its own dependency-free module because both services need these exact
 * values and they are about to become two separate repositories. Both
 * failures here are silent rather than loud, which is why they live in
 * one place with the reasoning attached.
 */

/*
 * Carries the visitor's real IP through to the intake endpoint so rate
 * limiting keys on the visitor rather than on the public service itself.
 *
 * If the two services disagreed on this string, the intake endpoint would
 * read `null`, fall back to the "unknown" bucket, and quietly place every
 * visitor on earth into a single shared rate limit.
 */
export const CLIENT_IP_HEADER = "x-oceara-client-ip";

/*
 * Slot bookings have always counted against a different budget to contact
 * and chat submissions, and that needs to stay true across the split: a
 * visitor who has just sent an enquiry should not find the "book a
 * viewing" button rate-limited as a result. Both the direct-write path
 * and the intake endpoint derive the bucket here so the two can never
 * drift into sharing one.
 */
export function leadRateLimitBucket(source, clientIp) {
  const prefix = source === "slot" ? "slot" : "lead";

  return `${prefix}:ip:${clientIp}`;
}
