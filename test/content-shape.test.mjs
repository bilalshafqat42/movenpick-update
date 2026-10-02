import { test } from "node:test";
import assert from "node:assert/strict";

import { normaliseContentPayload } from "@/lib/content-shape";

/*
 * The panel is a separate application, so its response shape is not under
 * this repo's control. Every shape below is one a reasonable implementation
 * might produce, and a mismatch fails silently — the site renders its
 * built-in defaults with nothing in any log to distinguish that from "the
 * panel is not connected yet". These tests are what stop that regressing.
 */

const oneRow = (payload) => Object.values(normaliseContentPayload(payload)).flat()[0];

test("accepts the documented shape", () => {
  const row = oneRow({
    sections: { hero: [{ key: "heading", type: "TEXT", value: "Hi", imageUrl: null }] },
  });
  assert.deepEqual(row, { key: "heading", type: "TEXT", value: "Hi", imageUrl: null });
});

test("accepts data, content and bare envelopes", () => {
  for (const payload of [
    { data: { hero: [{ key: "heading", value: "Hi" }] } },
    { content: { hero: [{ key: "heading", value: "Hi" }] } },
    { hero: [{ key: "heading", value: "Hi" }] },
  ]) {
    assert.equal(oneRow(payload).value, "Hi", JSON.stringify(payload));
  }
});

test("accepts a plain key/value object as a section", () => {
  assert.equal(oneRow({ sections: { hero: { heading: "Hi" } } }).value, "Hi");
});

test("accepts a fields wrapper", () => {
  assert.equal(
    oneRow({ sections: { hero: { fields: [{ key: "heading", value: "Hi" }] } } }).value,
    "Hi",
  );
});

test("accepts name or slug in place of key", () => {
  assert.equal(oneRow({ sections: { hero: [{ name: "heading", value: "Hi" }] } }).key, "heading");
  assert.equal(oneRow({ sections: { hero: [{ slug: "heading", value: "Hi" }] } }).key, "heading");
});

test("recognises an image from an explicit type or an imageUrl field", () => {
  assert.deepEqual(
    oneRow({ sections: { hero: [{ key: "img", type: "IMAGE", imageUrl: "/a.avif" }] } }),
    { key: "img", type: "IMAGE", value: null, imageUrl: "/a.avif" },
  );
  // imageUrl present with no type still means image
  assert.equal(oneRow({ sections: { hero: [{ key: "img", imageUrl: "/a.avif" }] } }).type, "IMAGE");
  // an explicit IMAGE type with the URL in `value` is tolerated
  assert.equal(
    oneRow({ sections: { hero: [{ key: "img", type: "IMAGE", value: "/a.avif" }] } }).imageUrl,
    "/a.avif",
  );
});

test("REGRESSION: a bare URL is never guessed to be an image", () => {
  /*
   * A previous regex classified any https URL containing a path as an image,
   * so page links and wa.me links became IMAGE rows. The type is not what the
   * site renders from, so it was harmless — but it was wrong, and wrong in a
   * way that would bite the moment anything branched on type.
   */
  for (const url of [
    "https://example.com/terms-of-use",
    "https://wa.me/971500000000",
    "/images/hero/hero.avif",
  ]) {
    const row = oneRow({ sections: { hero: { link: url } } });
    assert.equal(row.type, "TEXT", url);
    assert.equal(row.value, url, url);
  }
});

test("preserves a false boolean rather than dropping it", () => {
  /*
   * BOOLEAN fields are stored as the strings "true"/"false" everywhere else,
   * and a real `false` would otherwise be discarded as empty — silently
   * turning robots.txt's allow-indexing back on.
   */
  const row = oneRow({ sections: { robots: { "allow-indexing": false } } });
  assert.equal(row.value, "false");
});

test("stringifies numbers", () => {
  assert.equal(oneRow({ sections: { hero: { count: 63 } } }).value, "63");
});

test("yields nothing usable for malformed or error payloads", () => {
  for (const payload of [
    { error: "Not authenticated." },
    { sections: {} },
    null,
    undefined,
    [1, 2, 3],
    "nope",
    42,
  ]) {
    assert.deepEqual(
      normaliseContentPayload(payload),
      {},
      `expected {} for ${JSON.stringify(payload)}`,
    );
  }
});

test("an error response does not become a section called error", () => {
  const out = normaliseContentPayload({ error: "Not authenticated." });
  assert.ok(!("error" in out));
});

test("omits empty sections instead of storing empty arrays", () => {
  const out = normaliseContentPayload({ sections: { hero: [], about: { heading: "Hi" } } });
  assert.deepEqual(Object.keys(out), ["about"]);
});

test("drops rows with no usable key or value", () => {
  const out = normaliseContentPayload({
    sections: { hero: [{ value: "no key" }, { key: "ok", value: "kept" }, { key: "empty" }] },
  });
  assert.deepEqual(out.hero.map((r) => r.key), ["ok"]);
});
