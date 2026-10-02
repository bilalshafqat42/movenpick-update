"use client";

import { useState } from "react";
import Image from "next/image";

/*
 * next/image with a fallback for when the source fails to load.
 *
 * Needed because image URLs no longer come from this repository. They come
 * from the central admin panel, and there are several ordinary ways for one
 * to stop resolving that have nothing to do with a bug here:
 *
 *   - an editor deletes or replaces the underlying file
 *   - the panel's storage host is briefly unreachable
 *   - the URL's host is not listed in IMAGE_HOSTS, so the browser's
 *     Content-Security-Policy blocks it
 *
 * That last one is the nastiest, because it fails entirely client-side: the
 * server logs nothing, the HTML is correct, and the only symptom is a
 * broken-image icon in the visitor's browser. Exactly how the chat widget's
 * country flags failed earlier — silently, for weeks, until someone looked.
 *
 * On a development site a broken icon is a puzzle to solve. On a luxury
 * property landing page it is lost trust, so the committed default is shown
 * instead: it is guaranteed present, already in the deploy, and is the copy
 * the site shipped with.
 *
 * Deliberately NOT a loading skeleton or spinner. These images sit behind
 * GSAP scroll animations that assume a stable element; swapping in a
 * different-sized placeholder mid-scroll would shift layout under an
 * animation already in flight.
 */
export default function SafeImage({ src, fallbackSrc, alt, ...props }) {
  /*
   * Keyed on src so that when content revalidates and a genuinely new URL
   * arrives, a previous failure does not permanently pin this to the
   * fallback. Without it, one transient error would outlive the fix.
   */
  const [failedSrc, setFailedSrc] = useState(null);

  const hasFailed = failedSrc === src;
  const resolved = hasFailed && fallbackSrc ? fallbackSrc : src;

  return (
    <Image
      {...props}
      src={resolved}
      alt={alt}
      onError={() => {
        /*
         * Only react to the first failure per src. If the fallback itself
         * fails there is nothing further to try, and re-setting state would
         * loop.
         */
        if (!hasFailed) {
          console.warn(
            `Image failed to load, using built-in default instead: ${src}`,
          );
          setFailedSrc(src);
        }
      }}
    />
  );
}
