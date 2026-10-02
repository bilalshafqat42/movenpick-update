import styles from "./PreviewBanner.module.css";

/*
 * Rendered by the root layout only while Next's draftMode() is enabled
 * (see src/app/layout.js) — the confirmation that what's on screen is the
 * current draft, not what's actually live, and the way back out of it.
 * A plain server-rendered link, not a client component: exiting preview is
 * a real page load through /api/preview/exit, which is what actually
 * clears draft mode server-side.
 */
export default function PreviewBanner() {
  return (
    <div className={styles.banner} role="status">
      <span className={styles.label}>Viewing a draft preview</span>
      <span>— this includes unpublished changes visitors don&apos;t see yet.</span>
      <a href="/api/preview/exit" className={styles.exit}>
        Exit preview
      </a>
    </div>
  );
}
