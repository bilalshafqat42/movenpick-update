/*
 * Runs once when a new server instance starts. Its one job today: push
 * this site's current content manifest to the central admin panel, so
 * the panel's picture of what's editable never drifts from what the
 * code actually declares — see src/lib/push-manifest.js for why that
 * drift is a real, previously-hit problem, not a hypothetical one.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { pushManifestToPanel } = await import("@/lib/push-manifest.js");

  /*
   * Deliberately NOT awaited.
   *
   * Next.js waits for register() before the server begins accepting requests,
   * so awaiting a network call here makes the site's availability depend on
   * the panel answering. It already has a timeout, which bounds the damage,
   * but even a bounded delay on every boot is a coupling worth not having:
   * pushing the manifest is useful, and never urgent.
   *
   * Safe to leave floating because pushManifestToPanel never throws — it
   * catches everything and logs. If that ever changes, this needs a .catch().
   */
  void pushManifestToPanel();
}
