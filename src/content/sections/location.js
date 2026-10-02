/*
 * The four "minutes away" destinations shown on the interactive map
 * (src/components/MapSection). Latitude/longitude here are the pin's
 * real position on the map, not just a label — renaming a destination
 * without updating its coordinates leaves the pin pointing at the old
 * place, so both are edited together as one destination.
 */
const LOCATION_ITEMS = [
  {
    // Coordinates unconfirmed — "Medcare Medical Centre" has several
    // Dubai branches; verify which one and update before publishing
    // (see the note at the top of this file on why both fields must
    // be edited together).
    time: "2 Min",
    destination: "Medcare Medical Centre",
    latitude: "25.0500",
    longitude: "55.2280",
  },
  {
    // Coordinates approximate — confirm before publishing.
    time: "9 Min",
    destination: "Dubai Hills Mall",
    latitude: "25.1010",
    longitude: "55.2450",
  },
  {
    time: "19 Min",
    destination: "Dubai Marina",
    latitude: "25.0805",
    longitude: "55.139",
  },
  {
    time: "23 Min",
    destination: "Dubai International Airport (DXB)",
    latitude: "25.2532",
    longitude: "55.3644",
  },
  {
    // Time is an estimate (Motor City to Downtown Dubai via Sheikh
    // Zayed Road) — confirm the actual drive time before publishing.
    time: "20 Min",
    destination: "Burj Khalifa",
    latitude: "25.197197",
    longitude: "55.274376",
  },
];

export const LOCATION_ITEM_COUNT = LOCATION_ITEMS.length;

function itemFieldKey(itemNumber, fieldName) {
  return `item-${itemNumber}-${fieldName}`;
}

export const LOCATION_FIELDS = [
  {
    key: "eyebrow",
    label: "Eyebrow",
    type: "TEXT",
    defaultValue: "",
  },
  {
    key: "heading",
    label: "Heading",
    type: "TEXT",
    defaultValue: "Duis Aute Irure Dolor In Reprehenderit",
  },
  {
    key: "intro-text",
    label: "Intro text",
    type: "TEXT",
    long: true,
    defaultValue:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  // map-image/map-image-alt deliberately removed, 18 August 2026: this
  // section rendered as a static image until the site replaced it with
  // the interactive Mapbox map now on the page (src/components/MapSection).
  // A static image field has no live consumer to wire it to any more — an
  // interactive map is not something a single image can represent — so
  // keeping the field would only recreate the exact "editable but does
  // nothing" problem this whole section was found to have.

  ...LOCATION_ITEMS.flatMap((item, index) => {
    const itemNumber = index + 1;

    return [
      {
        key: itemFieldKey(itemNumber, "time"),
        label: `Item ${itemNumber} — Time`,
        type: "TEXT",
        defaultValue: item.time,
      },
      {
        key: itemFieldKey(itemNumber, "destination"),
        label: `Item ${itemNumber} — Destination`,
        type: "TEXT",
        defaultValue: item.destination,
      },
      {
        key: itemFieldKey(itemNumber, "latitude"),
        label: `Item ${itemNumber} — Latitude`,
        type: "TEXT",
        helperText:
          "The pin's real position on the map. Changing the destination without updating this leaves the pin pointing at the old place. Find coordinates by right-clicking the location in Google Maps and copying the first number.",
        defaultValue: item.latitude,
      },
      {
        key: itemFieldKey(itemNumber, "longitude"),
        label: `Item ${itemNumber} — Longitude`,
        type: "TEXT",
        helperText: "The second number from the same Google Maps right-click.",
        defaultValue: item.longitude,
      },
    ];
  }),
];

export function shapeLocationContent(content) {
  const items = Array.from({ length: LOCATION_ITEM_COUNT }, (_, index) => {
    const itemNumber = index + 1;

    return {
      time: content[itemFieldKey(itemNumber, "time")],
      destination: content[itemFieldKey(itemNumber, "destination")],
      latitude: content[itemFieldKey(itemNumber, "latitude")],
      longitude: content[itemFieldKey(itemNumber, "longitude")],
    };
  });

  return {
    eyebrow: content.eyebrow,
    heading: content.heading,
    introText: content["intro-text"],
    items,
  };
}
