import styles from "./NavArrow.module.css";

/*
 * Previous / next arrow shared by the carousels. Positioning belongs to
 * the caller, through className.
 *
 * Two looks:
 * - "round" (default): the Back to Top button's artwork, rotated, so
 *   every round control on the page is one family.
 * - "line": a long, thin arrow in the current text colour, the same
 *   drawn-line arrow the site's buttons use, for sitting inline with
 *   other controls such as a progress bar.
 */
export default function NavArrow({
  direction,
  variant = "round",
  className = "",
  label,
  ...buttonProps
}) {
  const fallbackLabel = direction === "prev" ? "Previous slide" : "Next slide";

  return (
    <button
      type="button"
      className={`${styles.navButton} ${styles[variant]} ${styles[direction]} ${className}`}
      aria-label={label ?? fallbackLabel}
      title={label ?? fallbackLabel}
      {...buttonProps}
    >
      {variant === "line" ? (
        <svg
          className={styles.lineIcon}
          width="44"
          height="12"
          viewBox="0 0 44 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 6H42M37 1l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span className={styles.navIcon} aria-hidden="true">
          <span className={styles.navLightIcon} />
          <span className={styles.navDarkIcon} />
        </span>
      )}
    </button>
  );
}
