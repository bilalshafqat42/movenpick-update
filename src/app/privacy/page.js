import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSectionContent, buildDefaultsFromFields } from "@/lib/content";
import { PRIVACY_FIELDS } from "@/content/sections/privacy";
import styles from "../legal.module.css";

export const metadata = {
  title: "Privacy Policy | Movenpick",
  description: "How Movenpick collects, uses and protects your information.",
};

/*
 * `body` is admin-authored HTML, sanitised server-side by the central
 * panel (src/lib/content/sanitize-rich-text.mjs there) on every save, not
 * by this site — Movenpick holds no sanitiser of its own and trusts what the
 * panel already cleaned, the same division of responsibility documented
 * in INTEGRATION.md for every other field the panel supplies.
 */
export default async function PrivacyPage() {
  const content = await getSectionContent("privacy", buildDefaultsFromFields(PRIVACY_FIELDS));

  return (
    <>
      <Header />

      <main className={styles.page}>
        <div className={styles.content}>
          <h1 className={styles.heading}>{content.title}</h1>
          <div className={styles.body} dangerouslySetInnerHTML={{ __html: content.body }} />
        </div>
      </main>

      <Footer />
    </>
  );
}
