/*
 * Normalises whatever the admin panel returns into the row shape this site
 * renders from.
 *
 * Why this is tolerant rather than strict: the panel is a separate
 * application maintained by a separate team, and Oceara is one of several
 * sites it serves. Demanding one exact JSON shape means any reasonable
 * variation silently produces a site that renders its built-in defaults with
 * no error anywhere — which looks identical to "the panel is not connected
 * yet" and is miserable to diagnose. Every shape below is a natural way to
 * express the same data, so all of them are accepted.
 *
 * The canonical internal row is:
 *   { key, type, value, imageUrl }
 *
 * Accepted envelopes (checked in order):
 *   { sections: { hero: ... } }        the documented shape
 *   { data: { hero: ... } }            common REST convention
 *   { content: { hero: ... } }         also common
 *   { hero: ... }                      bare, no envelope
 *
 * Accepted per-section shapes:
 *   [ { key, type, value, imageUrl } ] the documented shape
 *   [ { key, value } ]                 type defaults to TEXT
 *   { heading: "text", img: "/a.png" } plain key/value object
 *   { fields: [ ... ] }                wrapped array
 */

const ENVELOPE_KEYS = ["sections", "data", "content"];

/*
 * A section slug maps to an object of rows. Anything else at the top level
 * (a string, an array, a number) is not a section map and is ignored rather
 * than guessed at.
 */
function looksLikeSectionMap(value) {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value)
  );
}

function unwrapEnvelope(payload) {
  if (!looksLikeSectionMap(payload)) {
    return null;
  }

  for (const key of ENVELOPE_KEYS) {
    if (looksLikeSectionMap(payload[key])) {
      return payload[key];
    }
  }

  /*
   * No recognised envelope, so treat the payload itself as the section map.
   * Guarded by the check above so a bare error response like
   * { error: "..." } yields an empty result instead of a section called
   * "error".
   */
  return payload;
}

/*
 * A bare scalar is always emitted as TEXT, never guessed at.
 *
 * There used to be a regex here that tried to spot image URLs and type them
 * IMAGE. It was both wrong and pointless. Wrong because it matched any https
 * URL containing a path, so "https://example.com/terms-of-use" and
 * "https://wa.me/971500000000" were classified as images. Pointless because
 * mergeRowsOverDefaults produces an identical merged value either way: IMAGE
 * reads row.imageUrl, TEXT reads row.value, and the scalar goes into whichever
 * field the type selects. Verified for image paths, CDN URLs and page links.
 *
 * So the guess could only ever be wrong about something no consumer reads.
 * An explicit `type` from the panel is still honoured in the object branch
 * below, which is where a real IMAGE row arrives.
 */

function inferRow(key, raw) {
  if (raw === null || raw === undefined) {
    return null;
  }

  /*
   * Already a row object: pass the recognised fields through, filling in
   * whichever of value/imageUrl was omitted.
   */
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const type = raw.type ?? (raw.imageUrl ? "IMAGE" : undefined);
    const value = raw.value ?? null;
    const imageUrl = raw.imageUrl ?? null;

    if (type === "IMAGE") {
      return { key, type: "IMAGE", value: null, imageUrl: imageUrl ?? value };
    }

    /*
     * A LIST row's payload travels under `items`, not `value`/`imageUrl`
     * (see public-content.js's toRow() on the panel side) — those two stay
     * null on a LIST row deliberately, so the null check below must not
     * treat that as "nothing here" and drop the row.
     */
    if (type === "LIST") {
      return {
        key,
        type: "LIST",
        value: null,
        imageUrl: null,
        items: Array.isArray(raw.items) ? raw.items : [],
      };
    }

    if (value === null && imageUrl === null) {
      return null;
    }

    return { key, type: type ?? "TEXT", value: value ?? imageUrl, imageUrl: null };
  }

  /*
   * A bare scalar. Booleans are stringified because that is how BOOLEAN rows
   * are stored and compared everywhere else in this codebase; a real `false`
   * would otherwise be dropped by the null check above.
   */
  const scalar = typeof raw === "boolean" ? String(raw) : raw;

  if (typeof scalar !== "string" && typeof scalar !== "number") {
    return null;
  }

  return { key, type: "TEXT", value: String(scalar), imageUrl: null };
}

function normaliseSection(section) {
  /*
   * { fields: [...] } — some admin systems wrap the list.
   */
  if (looksLikeSectionMap(section) && Array.isArray(section.fields)) {
    section = section.fields;
  }

  if (Array.isArray(section)) {
    return section
      .map((row) => {
        const key = row?.key ?? row?.name ?? row?.slug;

        return key ? inferRow(String(key), row) : null;
      })
      .filter(Boolean);
  }

  if (looksLikeSectionMap(section)) {
    return Object.entries(section)
      .map(([key, raw]) => inferRow(key, raw))
      .filter(Boolean);
  }

  return [];
}

export function normaliseContentPayload(payload) {
  const sectionMap = unwrapEnvelope(payload);

  if (!sectionMap) {
    return {};
  }

  const out = {};

  for (const [slug, section] of Object.entries(sectionMap)) {
    const rows = normaliseSection(section);

    /*
     * Empty sections are omitted rather than stored as []. A section present
     * but empty and a section absent mean the same thing to the caller — use
     * the defaults — and omitting keeps the merge in section-defaults.js
     * simple.
     */
    if (rows.length > 0) {
      out[slug] = rows;
    }
  }

  return out;
}
