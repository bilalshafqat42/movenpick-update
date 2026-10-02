import { readFile } from "node:fs/promises";
import path from "node:path";

import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { APPEARANCE_FIELDS } from "@/content/sections/appearance";

export const size = { width: 512, height: 512 };
export const contentType = "image/svg+xml";

function guessContentType(url) {
  if (url.endsWith(".png")) return "image/png";
  if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return "image/jpeg";
  if (url.endsWith(".webp")) return "image/webp";
  if (url.endsWith(".avif")) return "image/avif";
  return "image/svg+xml";
}

/*
 * A dynamic favicon rather than the usual static icon.svg, so an admin's
 * upload in Appearance takes effect without a redeploy. Local (default)
 * paths are read straight off disk instead of fetched over HTTP —
 * fetching the app's own URL from within itself is a fragile pattern in
 * serverless environments. Only a genuinely external Blob URL (an actual
 * upload) goes through fetch().
 */
export default async function Icon() {
  const content = await getSectionContent(
    "appearance",
    buildDefaultsFromFields(APPEARANCE_FIELDS),
  );

  const faviconUrl = content.favicon;
  let buffer;

  if (faviconUrl.startsWith("http")) {
    const response = await fetch(faviconUrl);
    buffer = Buffer.from(await response.arrayBuffer());
  } else {
    const filePath = path.join(process.cwd(), "public", faviconUrl);
    buffer = await readFile(filePath);
  }

  return new Response(buffer, {
    headers: {
      "Content-Type": guessContentType(faviconUrl),
    },
  });
}
