"use client";

import dynamic from "next/dynamic";

/*
 * `ssr: false` is only allowed inside a Client Component (Next.js throws
 * a build error if it's used directly in a Server Component) — this file
 * exists solely to hold that boundary so page.js can stay a plain Server
 * Component and just render <MapSection /> normally.
 *
 * MapSection pulls in mapbox-gl, a large mapping library that is only
 * needed once a visitor scrolls to the map. Loading it this way keeps it
 * out of the initial JS bundle (and off the mobile main thread) so it
 * downloads only when this section is actually rendered.
 */
const MapSection = dynamic(
  () => import("@/components/MapSection/MapSection"),
  { ssr: false },
);

export default MapSection;
