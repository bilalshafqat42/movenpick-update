/*
 * Parsing and validating latitude/longitude typed into the admin panel.
 *
 * Its own module, rather than living inside MapSection, for two reasons: it is
 * pure geometry validation with no relation to rendering a map, and MapSection
 * is a client component that imports mapbox-gl, so anything inside it cannot
 * be unit tested under plain node.
 */

/*
 * Valid ranges. Latitude spans the poles, longitude the meridians. Anything
 * outside is not a point on Earth.
 */
const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

/*
 * Tolerates the stray punctuation a real copy-paste from Google Maps' own
 * "Copy coordinates" carries along — a trailing comma, surrounding whitespace.
 * Returns NaN, never 0, for anything blank or not a real number, so callers
 * can tell "no usable value" apart from "genuinely is zero".
 */
export function parseCoordinate(rawValue) {
  const cleaned = rawValue?.trim().replace(/^,+|,+$/g, "").trim();

  return cleaned ? Number(cleaned) : NaN;
}

/*
 * A finite number is not enough to be a coordinate.
 *
 * Number.isFinite alone accepts 255.1972, -500 and 1e9, all of which would be
 * handed straight to Mapbox. The realistic way that happens is an editor
 * mistyping a digit or pasting into the wrong field — "255.1972" instead of
 * "25.1972" is one keystroke away — and the result is a pin placed nowhere, or
 * a map that fails to fit its bounds, with nothing explaining why.
 *
 * Range-checking turns that into a clean fall back to the built-in
 * coordinates: the label the editor changed still updates, and the map still
 * works.
 */
export function isValidLatitude(value) {
  return Number.isFinite(value) && Math.abs(value) <= MAX_LATITUDE;
}

export function isValidLongitude(value) {
  return Number.isFinite(value) && Math.abs(value) <= MAX_LONGITUDE;
}

/*
 * Parses a lat/lng pair into Mapbox's [longitude, latitude] order, or returns
 * null when either half is unusable.
 *
 * Both halves must be valid or neither is used. A pin placed at a real
 * latitude and a fallback longitude is somewhere in the sea, which is worse
 * than simply not moving: it looks deliberate.
 */
export function parseLngLat(rawLatitude, rawLongitude) {
  const latitude = parseCoordinate(rawLatitude);
  const longitude = parseCoordinate(rawLongitude);

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  return [longitude, latitude];
}
