/*
 * Venetian blind reveal.
 *
 * The image is split into horizontal bands, each with its own "slat" —
 * a hard-edged stripe centred in the band that starts as a hairline and
 * widens to fill the band's full height. Bands stagger their start
 * bottom-to-top, so the blind reads as opening upward as the visitor
 * scrolls, rather than every slat opening in lockstep.
 *
 * Built as a plain mask-image string recomputed from `progress` (0-1)
 * rather than a GSAP tween with a duration, so callers can pin it
 * exactly to scroll position or scrub it through a timeline, whichever
 * suits the section.
 *
 * Shared by the Payment and Amenities photos so the two read as the
 * same move rather than two hand-tuned near-misses.
 *
 * PERFORMANCE
 *
 * This string is handed to the browser on every scroll frame, and the
 * cost of it is not the JavaScript — building it measures under a tenth
 * of a millisecond. The cost is that the compositor re-parses the
 * gradient and re-rasterises a mask over a large element each time it
 * changes. Three things keep that affordable, none of which alter a
 * single rendered pixel:
 *
 *   1. Only the transition zone is described stop by stop. Because the
 *      bands stagger in order, the fully-open ones are always a
 *      contiguous run at the bottom and the fully-closed ones a
 *      contiguous run at the top, so each collapses to a single stop
 *      pair. That takes a mid-reveal gradient from 181 stops to roughly
 *      60, and a nearly-finished one to under 10.
 *   2. Progress is quantised, so a frame that would produce a mask
 *      indistinguishable from the one already applied does not touch
 *      the DOM at all. This matters most at the tail of a scrub, where
 *      deltas shrink towards nothing and the stutter would be most
 *      visible.
 *   3. One property is written, not two. Setting both the standard and
 *      the -webkit- property doubled the parse for no gain on any
 *      browser that supports the standard one.
 */

const BAND_COUNT = 30;
const BAND_HEIGHT = 100 / BAND_COUNT;
const WINDOW = 0.3;
const SPREAD = 1 - WINDOW;

/*
 * Finer than the smallest change anyone can see: one band is 1/30th of
 * the element, so at any plausible photo height a step this size moves
 * a slat edge by well under a pixel.
 */
const PROGRESS_QUANTUM = 1 / (BAND_COUNT * 20);

/*
 * White, not black, for the "revealed" stops: mask-image defaults to
 * luminance mode in modern spec-compliant browsers (mask value =
 * luminance × alpha), and black has zero luminance — so black reads as
 * fully MASKED OUT there, not revealed, leaving only anti-aliased
 * slivers at the hard-stop edges visible. White has full luminance, so
 * it reads as revealed under luminance mode, and under the older
 * alpha-only mode it's still fully opaque (alpha 1) either way —
 * correct under both.
 */
const REVEALED = "white";
const HIDDEN = "transparent";

const bandStartProgress = (index) => (index / (BAND_COUNT - 1)) * SPREAD;

export function buildVenetianMask(progress) {
  /*
   * Bands open in order, so these two boundaries are all that is needed
   * to know which bands are still worth describing individually:
   * everything below `firstPartial` is wide open, everything from
   * `firstClosed` up has not started.
   */
  let firstPartial = BAND_COUNT;
  let firstClosed = BAND_COUNT;

  for (let i = 0; i < BAND_COUNT; i += 1) {
    const local = (progress - bandStartProgress(i)) / WINDOW;

    if (local < 1 && firstPartial === BAND_COUNT) {
      firstPartial = i;
    }

    if (local <= 0) {
      firstClosed = i;
      break;
    }
  }

  const stops = [];

  /*
   * The open run, as one span rather than one per band. This also
   * removes the zero-width transparent stops that used to sit on every
   * internal band boundary, which could leave faint antialiased seam
   * lines across the photo.
   */
  if (firstPartial > 0) {
    const openTop = firstPartial * BAND_HEIGHT;

    stops.push(`${REVEALED} 0%`, `${REVEALED} ${openTop}%`);

    if (firstPartial === BAND_COUNT) {
      return `linear-gradient(0deg, ${stops.join(", ")})`;
    }

    stops.push(`${HIDDEN} ${openTop}%`);
  }

  for (let i = firstPartial; i < firstClosed; i += 1) {
    const local = Math.min(
      1,
      Math.max(0, (progress - bandStartProgress(i)) / WINDOW),
    );

    const bandBottom = i * BAND_HEIGHT;
    const bandTop = bandBottom + BAND_HEIGHT;
    const bandCenter = bandBottom + BAND_HEIGHT / 2;
    const half = (local * BAND_HEIGHT) / 2;
    const revealBottom = bandCenter - half;
    const revealTop = bandCenter + half;

    stops.push(
      `${HIDDEN} ${bandBottom}%`,
      `${HIDDEN} ${revealBottom}%`,
      `${REVEALED} ${revealBottom}%`,
      `${REVEALED} ${revealTop}%`,
      `${HIDDEN} ${revealTop}%`,
      `${HIDDEN} ${bandTop}%`,
    );
  }

  /*
   * A gradient's last colour runs to the end on its own, so the closed
   * run at the top needs one stop, not one per band.
   */
  stops.push(`${HIDDEN} ${firstClosed * BAND_HEIGHT}%`, `${HIDDEN} 100%`);

  return `linear-gradient(0deg, ${stops.join(", ")})`;
}

/*
 * Resolved once, lazily: `CSS` does not exist during server rendering,
 * and every caller runs inside an effect anyway.
 */
let maskProperty;

function maskPropertyName() {
  if (maskProperty) {
    return maskProperty;
  }

  const standardSupported =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("mask-image", "linear-gradient(#000, #000)");

  maskProperty = standardSupported ? "maskImage" : "webkitMaskImage";

  return maskProperty;
}

/*
 * Last quantised step written to each element, so a frame that would
 * repaint the same mask can be skipped. Weak so it never keeps a
 * detached node alive.
 */
const appliedStep = new WeakMap();

export function clearVenetianMask(element) {
  appliedStep.delete(element);
  element.style[maskPropertyName()] = "none";
}

/*
 * Reversible: callers scrub this both ways, so a progress that drops
 * back below 1 has to bring the blind back rather than stay cleared.
 */
export function applyVenetianMask(element, progress) {
  /*
   * Drop the mask entirely once every slat is fully open, which takes
   * the element back off the mask compositing path for the rest of the
   * page's life — the state it spends most of its time in.
   */
  if (progress >= 1) {
    if (appliedStep.get(element) !== Infinity) {
      element.style[maskPropertyName()] = "none";
      appliedStep.set(element, Infinity);
    }

    return;
  }

  const step = Math.round(Math.max(0, progress) / PROGRESS_QUANTUM);

  if (appliedStep.get(element) === step) {
    return;
  }

  appliedStep.set(element, step);
  element.style[maskPropertyName()] = buildVenetianMask(step * PROGRESS_QUANTUM);
}
