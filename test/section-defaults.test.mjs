import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildDefaultsFromFields,
  mergeRowsOverDefaults,
  fieldDefault,
} from "@/lib/section-defaults";

/*
 * This merge is what makes the site safe to point at an external panel: a
 * missing or unreachable field falls back to the copy the site shipped with,
 * rather than rendering blank. If it regresses, the failure is a visibly
 * empty page in production.
 */

const FIELDS = [
  { key: "heading", type: "TEXT", defaultValue: "Default heading" },
  { key: "image", type: "IMAGE", defaultValue: "/images/default.avif" },
];

test("builds a key/value map of defaults", () => {
  assert.deepEqual(buildDefaultsFromFields(FIELDS), {
    heading: "Default heading",
    image: "/images/default.avif",
  });
});

test("a stored value overrides its default", () => {
  const merged = mergeRowsOverDefaults(
    [{ key: "heading", type: "TEXT", value: "From panel", imageUrl: null }],
    buildDefaultsFromFields(FIELDS),
  );
  assert.equal(merged.heading, "From panel");
});

test("fields the panel did not send keep their defaults", () => {
  const merged = mergeRowsOverDefaults(
    [{ key: "heading", type: "TEXT", value: "From panel", imageUrl: null }],
    buildDefaultsFromFields(FIELDS),
  );
  assert.equal(merged.image, "/images/default.avif");
});

test("no rows at all yields exactly the defaults", () => {
  assert.deepEqual(
    mergeRowsOverDefaults([], buildDefaultsFromFields(FIELDS)),
    buildDefaultsFromFields(FIELDS),
  );
});

test("an IMAGE row is read from imageUrl, not value", () => {
  const merged = mergeRowsOverDefaults(
    [{ key: "image", type: "IMAGE", value: null, imageUrl: "/uploads/new.avif" }],
    buildDefaultsFromFields(FIELDS),
  );
  assert.equal(merged.image, "/uploads/new.avif");
});

test("an IMAGE row with a blank imageUrl falls back rather than rendering nothing", () => {
  /*
   * A panel that returns an image field it has no file for must not blank the
   * image. Rendering src="" is a broken image on a luxury property page.
   */
  for (const blank of [null, "", undefined]) {
    const merged = mergeRowsOverDefaults(
      [{ key: "image", type: "IMAGE", value: null, imageUrl: blank }],
      buildDefaultsFromFields(FIELDS),
    );
    assert.equal(merged.image, "/images/default.avif", `imageUrl=${JSON.stringify(blank)}`);
  }
});

test("an empty string IS a real value for text and is honoured", () => {
  /*
   * Deliberate asymmetry with images above. An editor clearing a text field
   * means "show nothing here", and silently restoring the default would
   * override an intentional edit they cannot then undo.
   */
  const merged = mergeRowsOverDefaults(
    [{ key: "heading", type: "TEXT", value: "", imageUrl: null }],
    buildDefaultsFromFields(FIELDS),
  );
  assert.equal(merged.heading, "");
});

test("a null text value falls back to the default", () => {
  const merged = mergeRowsOverDefaults(
    [{ key: "heading", type: "TEXT", value: null, imageUrl: null }],
    buildDefaultsFromFields(FIELDS),
  );
  assert.equal(merged.heading, "Default heading");
});

test("rows for unknown keys are carried through, not dropped", () => {
  const merged = mergeRowsOverDefaults(
    [{ key: "brand-new", type: "TEXT", value: "added in the panel", imageUrl: null }],
    buildDefaultsFromFields(FIELDS),
  );
  assert.equal(merged["brand-new"], "added in the panel");
});

test("fieldDefault reads the committed default used as an image fallback", () => {
  assert.equal(fieldDefault(FIELDS, "image"), "/images/default.avif");
  assert.equal(fieldDefault(FIELDS, "nope"), null);
});
