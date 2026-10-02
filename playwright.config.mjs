import { defineConfig, devices } from "@playwright/test";

/*
 * 3917 rather than 3000/3001: this machine runs other unrelated Next.js
 * projects (leos-project, bilal-web) whose dev servers occasionally
 * restart and grab the low, commonly-defaulted ports. reuseExistingServer
 * below can't tell those apart from this project's own server — it just
 * checks that *something* answers at the URL — so a collision here means
 * these tests silently run against a different app entirely, surfacing
 * as `page.fill("#email")` timeouts with no obvious cause. A port well
 * outside the common 3000-3010 range avoids that class of flake.
 */
const PORT = 3917;
const BASE_URL = `http://localhost:${PORT}`;

/*
 * These tests touch no database and no shared state.
 *
 * That is a change worth noting: they used to run against the real dev
 * database, creating e2e-* accounts and read-modify-restoring live content
 * rows. That was always flagged as a risk, and it bit — a run that timed
 * out mid-test left a placeholder heading in live content, because the
 * restore step never executed. This app no longer has a database, so the
 * whole hazard is gone rather than merely mitigated.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },

  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
