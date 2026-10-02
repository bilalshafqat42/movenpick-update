/*
 * Which site this deployment is, from the central admin panel's point of
 * view.
 *
 * The admin panel is multi-site: Movenpick is one landing page among
 * several (alongside Oceara), all managed from one place. So every
 * request this app makes to it has to say which site it is asking
 * about, or the panel has no way to know whose content to return.
 * Without this the contract only works for exactly one site, which is
 * the thing that would have to be unpicked later across every consumer.
 *
 * Defaults to "movenpick" so nothing breaks if the variable is unset,
 * but it is worth setting explicitly on Render: the failure mode of a
 * wrong site key is another site's content rendering here, which is
 * much worse than an error.
 *
 * SECURITY NOTE for the admin panel side: the site key identifies, it does
 * not authorise. Issue each site its OWN bearer token and scope that token
 * server-side to that site's content. If one shared token can read any
 * site by changing a query parameter, then a single leaked landing-page
 * token exposes every client's content, including drafts for sites that
 * have not launched. Never derive access from the site key alone.
 */
export function getSiteKey() {
  return process.env.SITE_KEY?.trim() || "movenpick";
}
