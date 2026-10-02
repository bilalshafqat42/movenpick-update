/*
 * Field metadata (label, type, default) lives with each section's own
 * config in src/admin/sections/*.js — this just builds the plain
 * key -> defaultValue map that getSectionContent() merges database
 * values over.
 *
 * Deliberately pure and dependency-free (no "server-only", no Prisma, no
 * fetch): both the public site and the admin panel need it, and once
 * those become two separately deployed services this file is the kind of
 * thing that can be shared verbatim without dragging a database client
 * along with it.
 */
export function buildDefaultsFromFields(fields) {
  const defaults = {};

  for (const field of fields) {
    defaults[field.key] = field.defaultValue;
  }

  return defaults;
}

/*
 * Merges a section's stored rows over its defaults. Shared by both
 * content sources (database and HTTP API) so the two can never disagree
 * about precedence or about how an IMAGE row is read.
 *
 * A missing, blank, or not-yet-seeded row falls back to its default, so
 * the public site never shows blank content because of the content
 * source — worst case it shows exactly what it always hardcoded.
 */
export function mergeRowsOverDefaults(rows, defaults) {
  const merged = { ...defaults };

  for (const row of rows) {
    if (row.type === "IMAGE") {
      if (row.imageUrl) {
        merged[row.key] = row.imageUrl;
      }
    } else if (row.type === "LIST") {
      // A LIST row's payload travels under `items`, never `value` — see
      // public-content.js's toRow() on the panel side. An empty array is
      // still a real, meaningful answer ("nothing added yet"), so it is
      // merged in rather than treated like a missing value.
      if (Array.isArray(row.items)) {
        merged[row.key] = row.items;
      }
    } else if (row.value !== null && row.value !== undefined) {
      merged[row.key] = row.value;
    }
  }

  return merged;
}

/*
 * The committed default for one field, used as a fallback when a
 * panel-supplied image URL fails to load in the browser.
 *
 * Read from the section config rather than hardcoded at each call site, so a
 * changed default cannot drift out of sync with the fallback that is supposed
 * to mirror it. See src/components/SafeImage.js for why the fallback exists.
 */
export function fieldDefault(fields, key) {
  return fields.find((field) => field.key === key)?.defaultValue ?? null;
}
