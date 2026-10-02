import { writeFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";

/*
 * Exports Movenpick's complete content model to content-schema.json.
 *
 * Why this exists: the central admin panel is multi-site, so it needs to
 * be told what Movenpick's editable content actually IS — every section,
 * every field, each field's type, and its default value. Hand-maintaining
 * that list in a second system is the drift problem waiting to happen:
 * add a field here, forget it there, and an editor is offered a control
 * that renders nothing (or worse, a field silently disappears from the
 * panel while the site still reads it).
 *
 * So the section configs in src/admin/sections/ stay the single source of
 * truth, and this regenerates the machine-readable copy the panel
 * consumes. Run `npm run schema:export` after adding or changing a field
 * and commit the result; the diff is then reviewable.
 *
 * Deliberately contains no timestamp: re-running with no field changes
 * must produce a byte-identical file, so a noisy diff means something
 * really changed.
 */
register(new URL("./alias-loader.mjs", import.meta.url));

const { SECTION_REGISTRY, SECTION_GROUPS } = await import("@/content/sections");

const sections = Object.entries(SECTION_REGISTRY).map(([slug, config]) => ({
  slug,
  label: config.label,
  group: config.group,
  /*
   * Carried through because the central panel manages multiple sites and
   * will need its own permission model. These are Movenpick's current
   * boundaries: brand assets, SEO, and robots.txt are Admin-only, page
   * copy is Editor-editable.
   */
  minRole: config.minRole,
  /*
   * A section with no fields is not a mistake: "sitemap" is generated
   * from real data rather than edited, and exists in the panel only to
   * offer a link to the live file.
   */
  fields: config.fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    /*
     * `long` selects a textarea over a single-line input. Only meaningful
     * for TEXT, so it is emitted only where it is actually set.
     */
    ...(field.long ? { long: true } : {}),
    /*
     * Guidance shown under the field in the editor — e.g. "leave as
     * #contact to open the enquiry form" or how to find a coordinate.
     * Previously dropped here even when a section declared it, which
     * would have silently hidden it from every editor.
     */
    ...(field.helperText ? { helperText: field.helperText } : {}),
    /*
     * The live copy as shipped. The public site falls back to this
     * whenever the panel has no stored value for the key, which is what
     * lets the site render correctly before it has ever been edited and
     * survive the panel being unreachable. Seeding the panel with these
     * means an editor's first view shows the real site, not blanks.
     */
    defaultValue: field.defaultValue ?? null,
  })),
}));

const schema = {
  site: "movenpick",
  description:
    "Editable content model for the Movenpick landing page. Generated from src/admin/sections/ by npm run schema:export — do not edit by hand.",
  groups: SECTION_GROUPS,
  sections,
};

const outputPath = path.resolve(
  import.meta.dirname,
  "..",
  "content-schema.json",
);

writeFileSync(outputPath, `${JSON.stringify(schema, null, 2)}\n`);

const fieldCount = sections.reduce((total, s) => total + s.fields.length, 0);

console.log(
  `Wrote content-schema.json — ${sections.length} sections, ${fieldCount} fields.`,
);
