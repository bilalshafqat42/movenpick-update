import { test } from "node:test";
import assert from "node:assert/strict";

import { buildVenetianMask } from "@/lib/venetianMask";

/*
 * buildVenetianMask emits far fewer gradient stops than the shape of the
 * effect implies, by collapsing the run of fully-open bands at the
 * bottom and the run of fully-closed bands at the top into one stop pair
 * each. That is a performance change to a purely visual thing, which is
 * exactly the kind of change that silently degrades a design months
 * later.
 *
 * So rather than assert on the string, these tests evaluate the gradient
 * as the browser would — sampling the mask value down the element — and
 * compare it against a direct transcription of the effect as originally
 * written. The two must agree everywhere, at every stage of the reveal.
 */

const BAND_COUNT = 30;
const BAND_HEIGHT = 100 / BAND_COUNT;
const WINDOW = 0.3;
const SPREAD = 1 - WINDOW;

/*
 * The original implementation, kept here as the reference: one stop pair
 * per band, every band described whether or not it has anything to say.
 */
function referenceMask(progress) {
  const stops = [];

  for (let i = 0; i < BAND_COUNT; i += 1) {
    const bandStart = (i / (BAND_COUNT - 1)) * SPREAD;
    const local = Math.min(1, Math.max(0, (progress - bandStart) / WINDOW));

    const bandBottom = i * BAND_HEIGHT;
    const bandTop = bandBottom + BAND_HEIGHT;
    const bandCenter = bandBottom + BAND_HEIGHT / 2;
    const half = (local * BAND_HEIGHT) / 2;
    const revealBottom = bandCenter - half;
    const revealTop = bandCenter + half;

    stops.push(
      `transparent ${bandBottom}%`,
      `transparent ${revealBottom}%`,
      `white ${revealBottom}%`,
      `white ${revealTop}%`,
      `transparent ${revealTop}%`,
      `transparent ${bandTop}%`,
    );
  }

  return `linear-gradient(0deg, ${stops.join(", ")})`;
}

/*
 * Reads a `linear-gradient(0deg, ...)` the way a renderer does: 0% is the
 * bottom edge, each stop carries a colour, and a position between two
 * stops takes the colour of the run it falls in. Every stop here is
 * either fully revealed or fully hidden and adjacent stops share
 * positions at the hard edges, so there is no interpolation to model —
 * only "which run is this position inside".
 */
function sampleMask(gradient, atPercent) {
  const body = gradient.replace(/^linear-gradient\(0deg,\s*/, "").replace(/\)$/, "");

  const stops = body.split(",").map((raw) => {
    const [colour, position] = raw.trim().split(/\s+/);

    return { revealed: colour === "white", position: parseFloat(position) };
  });

  let value = stops[0].revealed;

  for (let i = 0; i < stops.length; i += 1) {
    if (stops[i].position > atPercent) {
      break;
    }

    value = stops[i].revealed;

    /*
     * A hard edge is two stops at the same position. Landing exactly on
     * one takes the later colour, which is what the renderer does.
     */
    if (
      stops[i].position === atPercent &&
      i + 1 < stops.length &&
      stops[i + 1].position === atPercent
    ) {
      value = stops[i + 1].revealed;
    }
  }

  return value;
}

const SAMPLE_COUNT = 1200;

function maskProfile(gradient) {
  return Array.from({ length: SAMPLE_COUNT }, (_, i) =>
    sampleMask(gradient, (i / (SAMPLE_COUNT - 1)) * 100),
  );
}

test("renders identically to the original at every stage of the reveal", () => {
  for (let step = 0; step <= 200; step += 1) {
    const progress = step / 200;

    assert.deepEqual(
      maskProfile(buildVenetianMask(progress)),
      maskProfile(referenceMask(progress)),
      `mask differs from the reference at progress ${progress}`,
    );
  }
});

test("nothing is revealed before the reveal starts", () => {
  assert.equal(
    maskProfile(buildVenetianMask(0)).some(Boolean),
    false,
    "progress 0 should mask the whole element",
  );
});

test("everything is revealed once the last slat opens", () => {
  assert.equal(
    maskProfile(buildVenetianMask(1)).every(Boolean),
    true,
    "progress 1 should reveal the whole element",
  );
});

test("the reveal only ever grows as progress grows", () => {
  let previous = 0;

  for (let step = 0; step <= 200; step += 1) {
    const revealed = maskProfile(buildVenetianMask(step / 200)).filter(Boolean).length;

    assert.ok(
      revealed >= previous,
      `revealed area shrank between progress ${(step - 1) / 200} and ${step / 200}`,
    );

    previous = revealed;
  }
});

test("it opens upward, never downward", () => {
  /*
   * Mid-reveal the open area has to sit at the BOTTOM of the element.
   * A blind that filled from the top would pass the equivalence test
   * above only if the reference were wrong too, so this pins the
   * direction independently.
   */
  const profile = maskProfile(buildVenetianMask(0.5));
  const lowerHalf = profile.slice(0, SAMPLE_COUNT / 2).filter(Boolean).length;
  const upperHalf = profile.slice(SAMPLE_COUNT / 2).filter(Boolean).length;

  assert.ok(
    lowerHalf > upperHalf,
    `expected the bottom to be more open than the top, got ${lowerHalf} vs ${upperHalf}`,
  );
});

test("the collapsed form is dramatically smaller than the reference", () => {
  const collapsed = buildVenetianMask(0.5).split(",").length;
  const reference = referenceMask(0.5).split(",").length;

  assert.ok(
    collapsed * 2 < reference,
    `expected at least half the stops to be gone, got ${collapsed} vs ${reference}`,
  );
});
