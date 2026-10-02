import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import {
  PROJECT_GALLERY_FIELDS,
  shapeProjectGalleryContent,
} from "@/content/sections/projectGallery";
import ProjectGalleryClient from "./ProjectGalleryClient";

export default async function ProjectGallery() {
  const content = await getSectionContent(
    "projectGallery",
    buildDefaultsFromFields(PROJECT_GALLERY_FIELDS),
  );

  const slides = shapeProjectGalleryContent(content);

  return <ProjectGalleryClient slides={slides} />;
}
