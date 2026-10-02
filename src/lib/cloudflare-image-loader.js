"use client";

/*
 * Used only when CLOUDFLARE_IMAGE_RESIZING=true (see next.config.mjs).
 * Replaces next/image's own resizing, which this instance's 0.5 CPU / 512 MB
 * cannot do reliably (see the images.unoptimized comment in next.config.mjs
 * for the 27 August 2026 incident this is the real fix for) — Cloudflare
 * resizes at its edge instead, so the container never encodes anything.
 *
 * Relative, not an absolute host: the browser resolves /cdn-cgi/image/...
 * against whichever domain served the page, so this works unchanged whether
 * `src` is a local /images path or an absolute URL from the admin panel's
 * media host, as long as Image Resizing (and "Resize images from any
 * origin", for the absolute-URL case) is enabled on this site's own
 * Cloudflare zone. Docs: https://developers.cloudflare.com/images/transform-images
 */
export default function cloudflareImageLoader({ src, width, quality }) {
  const params = [`width=${width}`, `quality=${quality || 75}`, "format=auto"];
  return `/cdn-cgi/image/${params.join(",")}/${src}`;
}
