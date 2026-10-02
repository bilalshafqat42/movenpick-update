import { test } from "node:test";
import assert from "node:assert/strict";

import { parseCoordinate, parseLngLat } from "@/lib/coordinates";

/*
 * The map pin's position is editable from the admin panel, which means an
 * editor types coordinates by hand or pastes them from Google Maps. Both are
 * error-prone in specific, predictable ways, and a bad coordinate places the
 * pin nowhere with nothing explaining why.
 */

test("parses a clean coordinate", () => {
  assert.equal(parseCoordinate("25.1972"), 25.1972);
});

test("tolerates what Google Maps' copy actually produces", () => {
  /*
   * Right-click -> Copy coordinates gives "25.1972, 55.2744". Pasting the
   * first half into Latitude carries the trailing comma along.
   */
  assert.equal(parseCoordinate("25.1972,"), 25.1972);
  assert.equal(parseCoordinate(" 55.2744 "), 55.2744);
  assert.equal(parseCoordinate(",25.1972"), 25.1972);
});

test("returns NaN, never 0, for blank or non-numeric input", () => {
  /*
   * Returning 0 would be a real place — off the coast of Africa — and would
   * silently move the pin there instead of falling back.
   */
  for (const input of ["", "   ", "abc", null, undefined, ","]) {
    assert.ok(Number.isNaN(parseCoordinate(input)), JSON.stringify(input));
  }
});

test("zero is preserved as a real coordinate", () => {
  assert.equal(parseCoordinate("0"), 0);
});

test("returns Mapbox's [longitude, latitude] order, not lat/lng", () => {
  /*
   * Mapbox takes [lng, lat], which is the reverse of how humans and Google
   * Maps write it. Getting this backwards puts Dubai in Somalia.
   */
  assert.deepEqual(parseLngLat("25.1972", "55.2744"), [55.2744, 25.1972]);
});

test("REGRESSION: rejects out-of-range values that Number.isFinite accepts", () => {
  /*
   * The original check was Number.isFinite alone, which accepts all of these.
   * "255.1972" is one keystroke from a valid Dubai latitude.
   */
  assert.equal(parseLngLat("255.1972", "55.2744"), null, "latitude 255");
  assert.equal(parseLngLat("25.1972", "-500"), null, "longitude -500");
  assert.equal(parseLngLat("1e9", "55.2744"), null, "latitude 1e9");
  assert.equal(parseLngLat("-91", "0"), null, "latitude just past the pole");
  assert.equal(parseLngLat("0", "181"), null, "longitude just past the meridian");
});

test("accepts the exact range boundaries", () => {
  assert.deepEqual(parseLngLat("90", "180"), [180, 90]);
  assert.deepEqual(parseLngLat("-90", "-180"), [-180, -90]);
});

test("a half-valid pair is rejected entirely", () => {
  /*
   * A real latitude combined with a fallback longitude is a pin in the sea,
   * which looks deliberate. Better not to move it at all.
   */
  assert.equal(parseLngLat("25.1972", ""), null);
  assert.equal(parseLngLat("", "55.2744"), null);
});

test("a whole pasted pair in one field is rejected rather than half-read", () => {
  assert.equal(parseLngLat("25.1972, 55.2744", "55.2744"), null);
});
