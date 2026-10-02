import { test, expect } from "@playwright/test";




/*
 * Regression tests for the security headers added after the August 2026
 * audit.
 *
 * The other blocks that used to live here (stored XSS in structured data,
 * cross-site export protection, upload hardening, backup exposure) all
 * exercised the built-in admin panel and have been removed along with it.
 * They are not gaps in coverage of THIS app — the surfaces they guarded no
 * longer exist here. They now belong to the central admin panel, which
 * owns the editing, uploads, and backups, and should carry equivalent
 * tests of its own. See INTEGRATION.md.
 */

test.describe("Security headers", () => {
  test("every response carries the hardening headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();

    expect(headers["content-security-policy"]).toBeTruthy();
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["strict-transport-security"]).toContain("max-age=");
  });

  test("CSP blocks inline object/embed and locks down the base URI", async ({
    request,
  }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"];

    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
  });
});
