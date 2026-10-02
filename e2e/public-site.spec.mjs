import { test, expect } from "@playwright/test";

test.describe("Public site smoke test", () => {
  test("homepage loads with no console errors and key sections render", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const response = await page.goto("/");
    expect(response.status()).toBe(200);

    await expect(page.locator("#home")).toBeAttached();
    await expect(page.locator("#amenities")).toBeAttached();
    await expect(page.locator("#project")).toBeAttached();
    await expect(page.locator("#gallery")).toBeAttached();
    await expect(page.locator("#payment-plan")).toBeAttached();
    await expect(page.locator("#contact")).toBeAttached();

    expect(errors).toEqual([]);
  });

  test("robots.txt and the dynamic favicon route both respond", async ({
    request,
  }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();

    const icon = await request.get("/icon");
    expect(icon.ok()).toBeTruthy();
  });
});
