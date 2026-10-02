import dynamic from "next/dynamic";

import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { CHAT_AGENT_FIELDS } from "@/content/sections/chatAgent";
import { LOCATION_FIELDS, shapeLocationContent } from "@/content/sections/location";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProjectOverview from "@/components/ProjectOverview";
import Amenities from "@/components/Amenities";
import ProjectGallery from "@/components/ProjectGallery";
import TrustedPartner from "@/components/TrustedPartner";
import Project from "@/components/Project";
import SeaSection from "@/components/SeaSection";
import Gallery from "@/components/Gallery";
import Payment from "@/components/Payment";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop/BackToTop";
import Chat from "@/components/Chat/Chat";

/*
 * This is a Server Component (no "use client") so sections like Amenities
 * can fetch their own content from the database as async Server
 * Components. The map's `ssr: false` dynamic import needs a Client
 * Component, so that lives in DynamicMapSection.
 */
const MapSection = dynamic(() => import("./DynamicMapSection"));

/*
 * Contact and ContactPopup both pull in react-phone-number-input and
 * libphonenumber-js/max (full phone metadata for every country), one of
 * the heaviest pieces of JS on this page. Both are still server-rendered
 * (no ssr:false) so the form content stays in the initial HTML for SEO
 * and there's no layout shift, but next/dynamic moves the phone-validation
 * code into its own chunk instead of the main bundle every visitor has to
 * parse before the page becomes interactive.
 */
const Contact = dynamic(() => import("@/components/Contact"));
const ContactPopup = dynamic(() => import("@/components/ContactPopup"));

export default async function Home() {
  const chatAgentContent = await getSectionContent(
    "chatAgent",
    buildDefaultsFromFields(CHAT_AGENT_FIELDS),
  );

  const locationContent = shapeLocationContent(
    await getSectionContent("location", buildDefaultsFromFields(LOCATION_FIELDS)),
  );

  return (
    <>
      <Header />

      <main>
        <Hero />

        <ProjectOverview />

        <Amenities />

        <ProjectGallery />

        <TrustedPartner />

        <Gallery />

        {/* <Project /> */}

        <MapSection
          eyebrow={locationContent.eyebrow}
          heading={locationContent.heading}
          introText={locationContent.introText}
          destinations={locationContent.items}
        />

        {/* <SeaSection /> */}

        <Payment />

        <Contact />

        <Footer />
      </main>

      <ContactPopup />
      <BackToTop />
      <Chat
        agentPhoto={chatAgentContent["agent-photo"]}
        agentPhotoSquare={chatAgentContent["agent-photo-square"]}
        projectName={chatAgentContent["project-name"]}
        projectShortName={chatAgentContent["project-short-name"]}
      />
    </>
  );
}
