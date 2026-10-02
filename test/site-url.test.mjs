import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { getSiteUrl } from "@/lib/site-url";

/*
 * This already broke one deploy: SITE_URL was entered without a scheme and the
 * build died in generateMetadata with `TypeError: Invalid URL`, pointing at
 * layout.js and saying nothing about which variable was wrong.
 *
 * The other failure mode is worse because it is silent: an unset SITE_URL
 * publishes localhost URLs to search engines and breaks every social share
 * preview, with nothing erroring and no test failing. Hence these.
 */

afterEach(() => {
  delete process.env.SITE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
});

test("REGRESSION: a bare hostname is repaired, not rejected", () => {
  process.env.SITE_URL = "oceara.refinedubai.com";
  assert.equal(getSiteUrl(), "https://oceara.refinedubai.com");
});

test("normalises trailing slashes, whitespace and case", () => {
  for (const [input, expected] of [
    ["https://oceara.refinedubai.com/", "https://oceara.refinedubai.com"],
    ["  https://oceara.refinedubai.com  ", "https://oceara.refinedubai.com"],
    ["HTTPS://Oceara.REFINEDUBAI.com", "https://oceara.refinedubai.com"],
    ["//oceara.refinedubai.com", "https://oceara.refinedubai.com"],
  ]) {
    process.env.SITE_URL = input;
    assert.equal(getSiteUrl(), expected, input);
  }
});

test("an explicit http scheme is preserved for local or staging use", () => {
  process.env.SITE_URL = "http://staging.oceara.refinedubai.com";
  assert.equal(getSiteUrl(), "http://staging.oceara.refinedubai.com");
});

test("genuinely unparseable input throws, naming the variable", () => {
  /*
   * Deliberately loud. Falling back to localhost here would publish localhost
   * URLs to Google, which costs far more than a failed build.
   */
  process.env.SITE_URL = "not a url at all !!";
  assert.throws(() => getSiteUrl(), /SITE_URL is not a valid URL/);
});

test("falls back to the Vercel variable, which is a bare hostname by design", () => {
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "oceara.vercel.app";
  assert.equal(getSiteUrl(), "https://oceara.vercel.app");
});

test("SITE_URL wins over the Vercel variable", () => {
  process.env.SITE_URL = "https://oceara.refinedubai.com";
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "oceara.vercel.app";
  assert.equal(getSiteUrl(), "https://oceara.refinedubai.com");
});

test("unset falls back to localhost for development", () => {
  assert.equal(getSiteUrl(), "http://localhost:3000");
});
