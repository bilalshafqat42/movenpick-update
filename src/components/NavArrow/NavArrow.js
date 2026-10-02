import styles from "./NavArrow.module.css";

/*
 * Previous / next arrow shared by the carousels. The artwork is the
 * Back to Top button's, rotated, so every round control on the page is
 * one family. Positioning belongs to the caller, through className.
 */
export default function NavArrow({
  direction,
  className = "",
  label,
  ...buttonProps
}) {
  const fallbackLabel = direction === "prev" ? "Previous slide" : "Next slide";

  return (
    <button
      type="button"
      className={`${styles.navButton} ${styles[direction]} ${className}`}
      aria-label={label ?? fallbackLabel}
      title={label ?? fallbackLabel}
      {...buttonProps}
    >
      <span className={styles.navIcon} aria-hidden="true">
        <span className={styles.navLightIcon} />
        <span className={styles.navDarkIcon} />
      </span>
    </button>
  );
}
