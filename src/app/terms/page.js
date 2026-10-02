import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { TERMS_FIELDS } from "@/content/sections/terms";
import { sanitizeRichText } from "@/lib/sanitize-rich-text";
import styles from "../legal.module.css";

export const metadata = {
  title: "Terms & Conditions | Movenpick",
  description: "The terms and conditions governing use of the Movenpick website.",
};

// See privacy/page.js's note on how `body` is sanitised before rendering.
export default async function TermsPage() {
  const content = await getSectionContent("terms", buildDefaultsFromFields(TERMS_FIELDS));

  return (
    <>
      <Header />

      <main className={styles.page}>
        <div className={styles.content}>
          <h1 className={styles.heading}>{content.title}</h1>
          <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitizeRichText(content.body) }} />
        </div>
      </main>

      <Footer />
    </>
  );
}
