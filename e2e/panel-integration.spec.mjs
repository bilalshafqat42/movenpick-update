import { test, expect } from "@playwright/test";

/*
 * Covers this app's side of the contract with the central admin panel
 * (see INTEGRATION.md), and asserts that the built-in admin panel is
 * genuinely gone rather than merely unlinked.
 */

test.describe("Revalidation webhook", () => {
  /*
   * The only endpoint the panel calls on this app, and the only
   * authenticated surface left here. It takes no body and does real work
   * (dropping cached content), so an unauthenticated caller could otherwise
   * force a cache flush on every request and turn a cached site into an
   * uncached one.
   */
  const cases = [
    ["no Authorization header", undefined],
    ["a wrong token", "Bearer definitely-not-the-real-secret"],
    ["a malformed header with no Bearer prefix", "definitely-not-the-real-secret"],
  ];

  for (const [description, authorization] of cases) {
    test(`rejects ${description}`, async ({ request }) => {
      /*
       * Needs a configured secret to be a meaningful test. Unconfigured, the
       * endpoint correctly answers 500 ("REVALIDATE_SECRET is not configured")
       * rather than 401, because a misconfigured service and a wrong token are
       * different problems and should not look alike to whoever is debugging.
       *
       * Skipped rather than asserted-around so the distinction stays visible:
       * a silent pass here would hide that the rejection path was never
       * actually exercised.
       */
      test.skip(
        !process.env.REVALIDATE_SECRET,
        "REVALIDATE_SECRET not set in this environment",
      );

      const response = await request.post("/api/revalidate", {
        headers: authorization ? { authorization } : {},
      });

      expect(response.status()).toBe(401);
    });
  }

  test("reports a missing secret as a misconfiguration, not a bad token", async ({
    request,
  }) => {
    /*
     * The inverse case, so the 500 branch is covered too rather than merely
     * skipped past. This is what an unconfigured deployment looks like, and it
     * is deliberately distinguishable from a rejected token.
     */
    test.skip(
      Boolean(process.env.REVALIDATE_SECRET),
      "only meaningful when the secret is absent",
    );

    const response = await request.post("/api/revalidate");

    expect(response.status()).toBe(500);
    expect((await response.json()).error).toMatch(/REVALIDATE_SECRET/);
  });

  test("accepts the configured secret", async ({ request }) => {
    const secret = process.env.REVALIDATE_SECRET;

    test.skip(!secret, "REVALIDATE_SECRET not set in this environment");

    const response = await request.post("/api/revalidate", {
      headers: { authorization: `Bearer ${secret}` },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ revalidated: true });
  });
});

test.describe("Built-in admin panel is removed", () => {
  /*
   * Regression test for the removal itself.
   *
   * These paths must not resolve at all. Previously they were guarded by a
   * session check, so a reintroduction — a stray file, a bad merge, a
   * revert — would look like a working login page rather than an error, and
   * nothing else in the suite would notice. Asserting 404 makes the removal
   * a property the tests hold rather than a state of the tree.
   *
   * 404 specifically, not "not 200": a 500 here would mean the route still
   * exists and is failing, which is a different and more alarming problem.
   */
  const removedPaths = [
    "/admin-panel",
    "/admin-panel/login",
    "/admin-panel/leads",
    "/admin-panel/users",
    "/api/admin/upload",
    "/api/admin/leads/export",
    "/api/admin/backups/run",
    "/api/content",
    "/api/leads/intake",
  ];

  for (const path of removedPaths) {
    test(`${path} returns 404`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });

      expect(response.status()).toBe(404);
    });
  }
});

test.describe("Content with no panel configured", () => {
  /*
   * With CONTENT_API_URL unset, the site must render the field defaults
   * committed in src/content/sections/ — a complete, correct page that
   * simply cannot be edited yet.
   *
   * This is the state the site deploys in before the panel is connected,
   * and the state it degrades to if the panel is ever unreachable, so it
   * needs to be a tested property rather than an assumption. A regression
   * here would look like a blank or half-rendered homepage in production.
   */
  test("the homepage renders real copy from the committed defaults", async ({
    page,
  }) => {
    await page.goto("/");

    /*
     * Values taken from src/content/sections/hero.js and footer.js. They
     * are asserted verbatim because the point is that real copy reaches the
     * page, which a looser check (non-empty heading) would not establish.
     */
    await expect(
      page.getByText("Life Shaped By Sea And Serenity.", { exact: false }),
    ).toBeVisible();

    await expect(page.locator("body")).toContainText("+971 4 330 0299");
  });

  test("sitemap.xml advertises the real site URL, never localhost", async ({
    request,
  }) => {
    /*
     * The failure this guards is silent: with SITE_URL unset in production
     * the sitemap publishes localhost URLs to search engines and every
     * social share preview breaks, while nothing errors and no page looks
     * wrong. Locally the expected value IS localhost, so this asserts
     * agreement with the configured value rather than a fixed string.
     */
    const response = await request.get("/sitemap.xml");

    expect(response.status()).toBe(200);

    const xml = await response.text();
    const expectedBase = process.env.SITE_URL?.replace(/\/+$/, "");

    if (expectedBase) {
      expect(xml).toContain(expectedBase);
    } else {
      expect(xml).toMatch(/<loc>https?:\/\/[^<]+<\/loc>/);
    }
  });
});
