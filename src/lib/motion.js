/*
 * Shared entrance-animation timing, so every GSAP entrance sequence on the
 * site reads as one consistent rhythm instead of each component picking
 * its own numbers. Change these three values to retune pacing everywhere
 * at once — the same idea as the brand color variables in globals.css,
 * just on the JS side since GSAP timelines aren't driven by CSS custom
 * properties.
 */
/*
 * Whether a stagger reads as a sequence depends on its size RELATIVE to
 * the duration, not on the size of the gap alone. Below about a fifth
 * of the duration, each element is still most of the way through its
 * own fade when the next one starts, and the group looks like it
 * arrived together.
 *
 * That is what was wrong here. The duration was 0.9s against a 0.15s
 * gap — 17% — so entrances read as simultaneous. Widening the gaps to
 * 0.225s and 0.34s made them legible but slow, because it treated the
 * symptom: the total wait grew while the ratio barely moved.
 *
 * Shortening the duration fixes both at once. At 0.6s the same 0.15s
 * gap is 25% of it, which is comfortably inside the range where a
 * sequence reads, and every entrance on the site finishes sooner than
 * it did before.
 */
export const ENTRANCE_STAGGER = 0.15;
export const ENTRANCE_DURATION = 0.6;
export const ENTRANCE_EASE = "power3.out";

/*
 * For runs of six or more — form fields, footer columns, a list of
 * destinations. At the full ENTRANCE_STAGGER a long list turns into a
 * queue: nine form fields would take 1.35s to finish arriving. This
 * keeps the cascade visible without making the reader wait for it.
 */
export const LIST_STAGGER = 0.08;

/*
 * How far an element travels as it fades in. Two values only: text
 * lifts a little, media a little more, and nothing else invents its
 * own distance.
 */
export const ENTRANCE_RISE = 24;
export const ENTRANCE_RISE_MEDIA = 32;

/*
 * Where a section's entrance fires, as a ScrollTrigger start.
 *
 * "top 50%" means the section's top edge has reached the middle of the
 * screen, so the section already fills the lower half before anything
 * animates. The reader is looking at it when it moves.
 *
 * The starts this replaced were eight separate figures between 56% and
 * 90%, which fired when a section filled only its first sliver of the
 * screen: measured at 1440x900, between 23% and 30% of the viewport.
 * The animation was largely over by the time the section was properly
 * in view, so it read as content that simply appeared.
 */
export const ENTRANCE_START = "top 50%";

/*
 * The hero's opening uses the same gap as every other section. It was
 * half again as wide while the durations were long; now that the
 * durations are short it does not need to be.
 */
export const HERO_COPY_STAGGER = ENTRANCE_STAGGER;

/*
 * The page-load opening.
 *
 * The header leads, then the hero's copy, then the scene behind it.
 *
 * That order is deliberate and it is the reverse of what this used to
 * do. Navigation is furniture, not content: the convention is that it
 * is present and usable within about 200ms while the content below it
 * cascades. Running five lines of copy first left the header blank for
 * 1,378ms — measured — during which the menu and the callback button
 * did not exist for a keyboard or a screen reader. Tab at 500ms landed
 * on a gallery button in the middle of the page, and a blank header
 * reads as a page still loading, which works against the impression
 * the sequence is there to create.
 *
 * The pattern and the photograph are the scene the copy sits in, not
 * the finale, so they fade in alongside it rather than queuing behind
 * everything. On desktop the photograph is below the fold while it
 * animates in any case.
 *
 * These are absolute times from the start of the sequence, and the
 * groups deliberately overlap: each sets off while the one before is
 * still arriving, which reads as one unfolding rather than a queue.
 */
export const INTRO_BREAKPOINT = "(min-width: 1025px)";

/* The header, immediately. */
export const INTRO_HEADER_START = 0;

/*
 * The hero's copy, once the header is essentially in. Late enough that
 * the two are distinguishable, early enough that nothing feels held up.
 */
export const INTRO_COPY_START = 0.3;

/* The pattern, then the photograph one step after it. */
export const INTRO_SCENE_START = 0.45;
