import { statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/*
 * Minimal Node module resolver for this project's "@/..." import alias.
 *
 * The alias is declared in jsconfig.json, which Next's bundler reads but
 * plain `node` does not. Without this, any script that wants to read the
 * section configs directly cannot import them, and the alternative —
 * regex-scraping the files — silently misses the sections that build
 * their field lists programmatically (Amenities and Gallery both do).
 *
 * Used only by scripts/, never at runtime.
 */
const SRC_DIR = path.resolve(import.meta.dirname, "..", "src");

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) {
    return nextResolve(specifier, context);
  }

  const base = path.join(SRC_DIR, specifier.slice(2));

  /*
   * The source omits extensions ("@/content/sections") and relies on
   * directory index resolution, both of which Node requires to be
   * explicit for ES modules.
   *
   * Must test for a FILE, not mere existence: "@/content/sections" is also
   * the name of a real directory, so an existence check matches the
   * directory first and hands Node a path it refuses to import.
   */
  for (const candidate of [base, `${base}.js`, path.join(base, "index.js")]) {
    if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }

  return nextResolve(specifier, context);
}
