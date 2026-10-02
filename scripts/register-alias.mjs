/*
 * Registers the "@/..." path alias for plain `node` runs, so the test files
 * can import application modules the same way the application does.
 *
 * Used by `npm test` via --import. See scripts/alias-loader.mjs.
 */
import { register } from "node:module";

register(new URL("./alias-loader.mjs", import.meta.url));
