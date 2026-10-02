import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import {
  GALLERY_FIELDS,
  shapeGalleryContent,
} from "@/content/sections/gallery";
import GalleryClient from "./GalleryClient";

export default async function Gallery() {
  const content = await getSectionContent(
    "gallery",
    buildDefaultsFromFields(GALLERY_FIELDS),
  );

  return <GalleryClient {...shapeGalleryContent(content)} />;
}
