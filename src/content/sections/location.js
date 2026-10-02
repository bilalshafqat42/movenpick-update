/*
 * The five "minutes away" destinations shown on the interactive map
 * (src/components/MapSection). Latitude/longitude here are the pin's
 * real position on the map, not just a label — renaming a destination
 * without updating its coordinates leaves the pin pointing at the old
 * place, so both are edited together as one destination.
 */
const LOCATION_ITEMS = [
  {
    time: "15 Min",
    destination: "Dubai Hills Mall",
    latitude: "25.10188808891355",
    longitude: "55.2402916478962",
  },
  {
    time: "15 Min",
    destination: "Sheikh Zayed Road",
    latitude: "25.0701390212613",
    longitude: "55.13773505527004",
  },
  {
    time: "15 Min",
    destination: "Mall of the Emirates",
    latitude: "25.11831097706271",
    longitude: "55.20109079391421",
  },
  {
    time: "15 Min",
    destination: "Burj Al Arab",
    latitude: "25.14137030878205",
    longitude: "55.18558447817823",
  },
  {
    time: "25 Min",
    destination: "Burj Khalifa",
    latitude: "25.19744938452987",
    longitude: "55.27471971906346",
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
  /*
   * Static on purpose: the destinations always come from LOCATION_ITEMS
   * above, never from the admin panel's item fields, so the live map
   * shows exactly these points whatever the panel has saved.
   */
  const items = LOCATION_ITEMS.map((item) => ({ ...item }));

  return {
    eyebrow: content.eyebrow,
    heading: content.heading,
    introText: content["intro-text"],
    items,
  };
}
