export const PROJECT_FIELDS = [
  {
    key: "eyebrow",
    label: "Eyebrow",
    type: "TEXT",
    defaultValue: "A Residential",
  },
  {
    key: "title",
    label: "Title",
    type: "TEXT",
    defaultValue: "Retreat On Dubai Islands",
  },
  {
    key: "button-label",
    label: "Brochure button label",
    type: "TEXT",
    defaultValue: "Download Brochure",
  },
  {
    key: "brochure-url",
    label: "Brochure file link",
    type: "LINK",
    /*
     * Was "/pdf/oceara-brochure.pdf" — Oceara's own file, copy-pasted into
     * this project's field defaults and never corrected, serving a
     * different development's brochure under this site's own "Download
     * Brochure" button. This site's actual brochure was already uploaded
     * correctly (see projectOverview's cta-2-href, uploaded through the
     * panel to this site's own R2 prefix); reused here rather than
     * uploading a duplicate copy of the same file under a second name.
     */
    defaultValue:
      "https://media.refinedubai.com/movenpick/1787663749778-233b107bb8d0b8a3c2b13c0d36eca7d9.pdf",
  },
  {
    key: "description",
    label: "Description",
    type: "TEXT",
    long: true,
    defaultValue:
      "[Movenpick project description — unit count, types, and highlights to be provided]",
  },
  {
    key: "location",
    label: "Location text",
    type: "TEXT",
    long: true,
    defaultValue:
      "Set within Dubai Islands, this distinctive address occupies a unique position where expansive parkland meets the coastline. Defined by open outlooks, natural surroundings and a sense of separation from the pace of the city, it offers a residential environment shaped by space, calm and connection to nature.",
  },
  {
    key: "building-image",
    label: "Building image (used in both the desktop and mobile hero scene)",
    type: "IMAGE",
    helperText: "Recommended: 2560×1440px. Fills the whole screen in both scenes.",
    defaultValue: "/images/project/building.jpg",
  },
  {
    key: "building-image-alt",
    label: "Building image alt text",
    type: "TEXT",
    defaultValue: "[Add alt text for Movenpick project image]",
  },
  {
    key: "landscape-image",
    label: "Landscape editorial image",
    type: "IMAGE",
    helperText: "Recommended: 1920×940px. Wide crop.",
    defaultValue: "/images/project/dubai-islands.avif",
  },
  {
    key: "landscape-image-alt",
    label: "Landscape editorial image alt text",
    type: "TEXT",
    defaultValue: "Curtains overlooking the natural landscape",
  },
  {
    key: "portrait-image",
    label: "Portrait editorial image",
    type: "IMAGE",
    helperText: "Recommended: 1536×2160px. Tall crop.",
    /*
     * This file (/images/project/oceara-park.avif) does not exist in this
     * repo's public/images/project/ — it is a leftover from the template
     * this project was set up from and currently 404s on the live site.
     * Left as-is rather than guessed at: this needs a real Movenpick photo,
     * not an invented placeholder path.
     */
    defaultValue: "/images/project/oceara-park.avif",
  },
  {
    key: "portrait-image-alt",
    label: "Portrait editorial image alt text",
    type: "TEXT",
    defaultValue: "Curtains framing a calm coastal landscape",
  },
];
