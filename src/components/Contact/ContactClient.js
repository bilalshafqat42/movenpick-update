"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneInput from "react-phone-number-input";
import { trackEvent } from "@/lib/analytics";
/*
 * Bundled flag components rather than the library's default, which
 * fetches each flag as an image from a third-party GitHub Pages host at
 * runtime. That default sends every visitor's IP to a site we don't
 * control, breaks the field if that host goes down, and would need a
 * hole punched in the Content-Security-Policy to work at all. These are
 * inline SVGs (~20KB total) served from our own bundle instead.
 */
import flags from "react-phone-number-input/flags";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

import "react-phone-number-input/style.css";

import { gsap, useGSAP } from "@/lib/gsap";
import { revealOnArrival } from "@/lib/revealOnArrival";
import {
  ENTRANCE_DURATION,
  ENTRANCE_EASE,
  ENTRANCE_START,
  LIST_STAGGER,
} from "@/lib/motion";
import styles from "./Contact.module.css";

const TRACKING_STORAGE_KEY = "movenpick_campaign_tracking";
const SUBMISSION_STORAGE_KEY = "movenpick_form_submitted";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialForm = {
  firstName: "",
  lastName: "",
  userType: "",
  phone: "",
  email: "",
};

const initialTrackingData = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_content: "",
  utm_term: "",
  utm_referrer: "",
  page_url: "",
  landing_page_url: "",
  gclid: "",
  fbclid: "",
  msclkid: "",
};

const parseStoredTrackingData = (storedValue) => {
  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue);
  } catch {
    return null;
  }
};

function FieldError({ id, message }) {
  if (!message) {
    return null;
  }

  return (
    <div id={id} className={styles.fieldError} role="alert">
      <svg
        className={styles.fieldErrorIcon}
        width="16"
        height="16"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="9" fill="#B3541E" />
        <rect x="9" y="5" width="2" height="6" rx="1" fill="#ffffff" />
        <rect x="9" y="13" width="2" height="2" rx="1" fill="#ffffff" />
      </svg>

      <span>{message}</span>
    </div>
  );
}

export default function ContactClient({
  eyebrow,
  heading,
  description,
  submitButtonLabel,
}) {
  const router = useRouter();

  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const introRef = useRef(null);
  const formRef = useRef(null);

  const [formData, setFormData] = useState(initialForm);
  const [trackingData, setTrackingData] = useState(initialTrackingData);

  const [fieldError, setFieldError] = useState({ field: null, message: "" });
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * Sticky offset, measured rather than assumed.
   *
   * This section is held in place while the footer rides up over it. A
   * plain `top: 0` sticks it by the TOP edge, which is only correct
   * while the section fits on screen. It does not: measured at 1005px
   * against a 900px viewport, 1000px against 768px, 939px against 844px
   * — between 1.0 and 1.4 screens tall depending on the device.
   *
   * Sticking the top of something taller than the screen pins it the
   * instant its top arrives, stranding everything below the fold
   * permanently out of reach. The submit button lives at the very
   * bottom, so it was the part that got stranded: at 1366x768 and
   * 1280x800 there was NO scroll position at all where the button was
   * both fully visible and not covered by the footer.
   *
   * A negative offset equal to the overflow sticks it by the BOTTOM edge
   * instead. The section scrolls through normally until its last line
   * reaches the bottom of the screen, and only then holds — so the whole
   * form has been seen, button included, before anything covers it.
   *
   * It has to be measured because the height is content-driven (the
   * admin panel supplies the copy, and a validation message can add a
   * line), and it has to be re-measured on resize because the offset is
   * relative to a viewport height that changes — including when mobile
   * browser chrome slides away.
   */
  useEffect(() => {
    const section = sectionRef.current;

    if (!section || typeof window === "undefined") {
      return;
    }

    const applyStickyOffset = () => {
      const overflow = section.offsetHeight - window.innerHeight;

      /*
       * Zero, not a positive number, when the section already fits:
       * a positive `top` would push it down the screen rather than
       * holding it against the top.
       */
      const offset = overflow > 0 ? -overflow : 0;

      section.style.setProperty("--contact-sticky-top", `${offset}px`);
    };

    applyStickyOffset();

    const observer = new ResizeObserver(applyStickyOffset);
    observer.observe(section);

    window.addEventListener("resize", applyStickyOffset);
    window.addEventListener("orientationchange", applyStickyOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", applyStickyOffset);
      window.removeEventListener("orientationchange", applyStickyOffset);
    };
  }, []);

  /*
   * Capture and preserve campaign attribution.
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const searchParams = currentUrl.searchParams;

    const storedTrackingData = parseStoredTrackingData(
      window.sessionStorage.getItem(TRACKING_STORAGE_KEY),
    );

    const campaignParameterNames = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "utm_referrer",
      "gclid",
      "fbclid",
      "msclkid",
    ];

    const hasNewCampaignParameters = campaignParameterNames.some(
      (parameterName) => searchParams.has(parameterName),
    );

    const currentPageTracking = {
      utm_source: searchParams.get("utm_source") || "",
      utm_medium: searchParams.get("utm_medium") || "",
      utm_campaign: searchParams.get("utm_campaign") || "",
      utm_content: searchParams.get("utm_content") || "",
      utm_term: searchParams.get("utm_term") || "",

      utm_referrer: searchParams.get("utm_referrer") || document.referrer || "",

      page_url: window.location.href,
      landing_page_url: window.location.href,

      gclid: searchParams.get("gclid") || "",
      fbclid: searchParams.get("fbclid") || "",
      msclkid: searchParams.get("msclkid") || "",
    };

    let finalTrackingData;

    if (!storedTrackingData) {
      /*
       * First visit in the current browser session.
       */
      finalTrackingData = currentPageTracking;
    } else if (hasNewCampaignParameters) {
      /*
       * A new tagged advertising URL has been opened.
       */
      finalTrackingData = {
        ...storedTrackingData,
        ...currentPageTracking,

        landing_page_url:
          storedTrackingData.landing_page_url ||
          currentPageTracking.landing_page_url,

        utm_referrer:
          currentPageTracking.utm_referrer || storedTrackingData.utm_referrer,
      };
    } else {
      /*
       * Preserve the campaign values while updating
       * the page where the form is being completed.
       */
      finalTrackingData = {
        ...storedTrackingData,
        page_url: window.location.href,
      };
    }

    window.sessionStorage.setItem(
      TRACKING_STORAGE_KEY,
      JSON.stringify(finalTrackingData),
    );

    /*
     * setState inside this effect is deliberate and unavoidable.
     *
     * Campaign attribution is read from window.location and sessionStorage,
     * neither of which exists during server rendering — and this component IS
     * server-rendered for the initial HTML, so reading them in a useState
     * initialiser would break the build. An effect with an empty dependency
     * array is the correct place, and it costs exactly one extra render on
     * mount rather than the cascade the rule is guarding against.
     *
     * Worth leaving alone: this is what attaches utm_source, gclid and the
     * landing page to every enquiry. "Tidying" it into a render-time read
     * would silently strip attribution from the leads the sales team works.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrackingData(finalTrackingData);
  }, []);

  /*
   * Contact section scroll animations.
   */
  useGSAP(
    () => {
      const section = sectionRef.current;
      const viewport = viewportRef.current;
      const intro = introRef.current;
      const form = formRef.current;

      if (!section || !viewport || !intro || !form) {
        return;
      }

      const matchMedia = gsap.matchMedia();

      /*
       * `desktop` is not read below — the branches only care about
       * `mobile` and `reduceMotion` — but it has to be here.
       *
       * gsap.matchMedia() only activates a context while at least one
       * of its queries matches. With just the two conditions this had,
       * a desktop visitor with normal motion settings matched NEITHER,
       * so the callback never ran and this section had no entrance
       * animation whatsoever above 900px. Below 900px it worked, which
       * is why it looked like a desktop-only mystery. Measured: 8 of 8
       * form children carried GSAP styles at 900px wide and 0 of 8 at
       * 901px.
       */
      matchMedia.add(
        {
          desktop: "(min-width: 901px)",
          mobile: "(max-width: 900px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { mobile = false, reduceMotion = false } =
            context.conditions ?? {};

          const introChildren = Array.from(intro.children);

          /*
           * Only the children that actually show. The form also holds
           * eleven hidden inputs carrying the utm/gclid attribution,
           * and staggering across those spent most of the sequence on
           * nothing: the button and consent line arrived 1.4 seconds
           * after the last visible field, with a dead pause in
           * between. They stay in the form, they just take no part in
           * the animation.
           */
          const formChildren = Array.from(form.children).filter(
            (child) => !(child.tagName === "INPUT" && child.type === "hidden"),
          );

          if (reduceMotion) {
            gsap.set(viewport, {
              clipPath: "none",
            });

            gsap.set([...introChildren, ...formChildren], {
              clearProps: "all",
              autoAlpha: 1,
              y: 0,
            });

            return;
          }

          /*
           * Mobile: one line after another, and nothing else.
           *
           * No clip-path wipe here. That reveal is scrubbed against
           * scroll position, so on a handset — where this section is a
           * full 100svh that snaps into place — the whole panel was
           * still uncovering itself while the reader was already
           * looking at it. Text arriving one piece at a time says
           * "read me in this order" on its own; a second, scroll-linked
           * reveal underneath it only competed.
           *
           * No y offset either, for the same reason: any vertical
           * travel on a screen this size reads as the page still
           * settling rather than as an entrance. Opacity alone.
           *
           * Ordered by where each element actually sits on screen, not
           * by DOM order, because the mobile layout puts the form above
           * the description while the markup has them the other way
           * round. Sorting by position means the sequence follows the
           * eye whatever the CSS does with the order later.
           */
          if (mobile) {
            gsap.set(viewport, {
              clipPath: "none",
            });

            const inReadingOrder = [...introChildren, ...formChildren]
              /*
               * Anything with no height takes no part. The status line
               * is empty until a submission answers, and leaving it in
               * spent one whole step of the stagger on a row nobody can
               * see — a beat of nothing right before the closing
               * paragraph.
               */
              .filter((child) => child.getBoundingClientRect().height > 0)
              .sort(
                (first, second) =>
                  first.getBoundingClientRect().top -
                  second.getBoundingClientRect().top,
              );

            gsap.set(inReadingOrder, { autoAlpha: 0 });

            revealOnArrival({
              trigger: section,
              start: ENTRANCE_START,

              onReveal: () => {
                gsap.to(inReadingOrder, {
                  autoAlpha: 1,
                  duration: ENTRANCE_DURATION,
                  stagger: LIST_STAGGER,
                  ease: ENTRANCE_EASE,
                });
              },
            });

            return;
          }

          /*
           * Desktop: the text arrives, and nothing else does.
           *
           * There was a clip-path wipe here that uncovered the whole
           * panel from the bottom as you scrolled, scrubbed against
           * scroll position. It is gone. Two entrances competing over
           * the same moment read as one indecisive one, and the panel
           * uncovering itself underneath the copy was the half that was
           * not carrying any meaning: text arriving one piece at a time
           * already says "read me in this order".
           *
           * One timeline rather than two triggers a few percent apart,
           * so the left paragraph and the form are a single cascade
           * with one rhythm instead of two overlapping ones that happen
           * to start close together.
           */
          gsap.set(viewport, {
            clipPath: "none",
          });

          /*
           * Reading order for a two-column layout, which is not the
           * same as top-to-bottom: the paragraph on the left and the
           * form heading on the right sit within a few pixels of each
           * other vertically, so sorting by position would interleave
           * the two columns. Left column first, then the form from its
           * heading down, is how the section is actually read.
           *
           * Zero-height children are dropped for the same reason as on
           * mobile — the status line is empty until a submission
           * answers, and it would otherwise spend a whole step of the
           * stagger on a row nobody can see.
           */
          const inReadingOrder = [...introChildren, ...formChildren].filter(
            (child) => child.getBoundingClientRect().height > 0,
          );

          gsap.set(inReadingOrder, { autoAlpha: 0, y: 24 });

          const revealDesktop = () =>
            gsap.to(inReadingOrder, {
              autoAlpha: 1,
              y: 0,
              duration: ENTRANCE_DURATION,
              /*
               * Wide enough to read as one line after another rather
               * than the whole column arriving at once. An earlier
               * 0.07 spread the whole form over half a second and
               * looked like a single move.
               */
              stagger: LIST_STAGGER,
              ease: ENTRANCE_EASE,
            });

          revealOnArrival({
            trigger: section,
            start: ENTRANCE_START,
            onReveal: revealDesktop,
          });
        },
      );

      return () => {
        matchMedia.revert();
      };
    },
    {
      scope: sectionRef,
    },
  );

  const clearStatus = () => {
    if (!status) {
      return;
    }

    setStatus("");
    setStatusType("");
  };

  const clearFieldError = (field) => {
    setFieldError((current) =>
      current.field === field ? { field: null, message: "" } : current,
    );
  };

  const showFieldError = (field, message) => {
    setFieldError({ field, message });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    clearFieldError(name);
    clearStatus();
  };

  const handlePhoneChange = (value) => {
    setFormData((current) => ({
      ...current,
      phone: value || "",
    }));

    clearFieldError("phone");
    clearStatus();
  };

  const isMobileNumber = (phone) => {
    const parsed = parsePhoneNumberFromString(phone || "");

    if (!parsed || !parsed.isValid()) {
      return false;
    }

    const numberType = parsed.getType();

    /*
     * Some countries' numbering plans don't let libphonenumber
     * distinguish mobile from landline with certainty. Allow that
     * ambiguous case too, rather than rejecting valid numbers.
     */
    return numberType === "MOBILE" || numberType === "FIXED_LINE_OR_MOBILE";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFieldError({ field: null, message: "" });

    if (!formData.firstName.trim()) {
      showFieldError("firstName", "Please enter your first name.");
      return;
    }

    if (!formData.lastName.trim()) {
      showFieldError("lastName", "Please enter your last name.");
      return;
    }

    if (!formData.userType) {
      showFieldError("userType", "Please select an option.");
      return;
    }

    if (!formData.phone || !isMobileNumber(formData.phone)) {
      showFieldError("phone", "Please enter a valid mobile phone number.");
      return;
    }

    if (!EMAIL_PATTERN.test(formData.email.trim())) {
      showFieldError("email", "Please enter a valid email address.");
      return;
    }

    const submissionData = {
      /*
       * Visitor information.
       */
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      userType: formData.userType,
      phone: formData.phone,
      email: formData.email.trim(),

      /*
       * UTM campaign information.
       */
      utm_source: trackingData.utm_source,
      utm_medium: trackingData.utm_medium,
      utm_campaign: trackingData.utm_campaign,
      utm_content: trackingData.utm_content,
      utm_term: trackingData.utm_term,
      utm_referrer: trackingData.utm_referrer,

      /*
       * Page attribution.
       */
      page_url: trackingData.page_url,
      landing_page_url: trackingData.landing_page_url,

      /*
       * Advertising click identifiers.
       */
      gclid: trackingData.gclid,
      fbclid: trackingData.fbclid,
      msclkid: trackingData.msclkid,
    };

    try {
      setIsSubmitting(true);
      setStatus("");
      setStatusType("");

      const response = await fetch("/api/movenpick-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error("Lead submission failed");
      }

      trackEvent("contact_submit", { form_source: "contact" });

      /*
       * Store only non-sensitive confirmation data.
       * Do not place the visitor's email or phone
       * number in the Thank You page URL.
       */
      window.sessionStorage.setItem(
        SUBMISSION_STORAGE_KEY,
        JSON.stringify({
          submitted: true,
          submittedAt: new Date().toISOString(),
        }),
      );

      setFormData(initialForm);

      /*
       * Redirect after successful processing.
       */
      router.push("/thank-you");
    } catch (error) {
      console.error("Contact form submission failed:", error);

      setStatus("We could not submit your request. Please try again.");
      setStatusType("error");
      setIsSubmitting(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      className={styles.contact}
      aria-labelledby="contact-title"
    >
      <div ref={viewportRef} className={styles.viewport}>
        <div ref={introRef} className={styles.intro}>
          <p className={styles.description}>{description}</p>
        </div>

        <form
          ref={formRef}
          className={styles.form}
          onSubmit={handleSubmit}
          noValidate
        >
          {/*
           * The design sets this as one line, so the eyebrow lives
           * INSIDE the heading rather than above it. Both content
           * fields are untouched — "Reach Out" and "To Us" simply read
           * together now.
           *
           * It also fixes the section's accessible name: the h2 is what
           * aria-labelledby points at, so this section used to announce
           * itself as just "To Us".
           */}
          <header className={styles.headingGroup}>
            <h2 id="contact-title" className={styles.heading}>
              <span className={styles.eyebrow}>{eyebrow}</span> {heading}
            </h2>
          </header>

          {/* First Name and Last Name */}
          <div className={styles.nameRow}>
            <div className={styles.field}>
              <label
                htmlFor="contact-first-name"
                className={styles.visuallyHidden}
              >
                First Name
              </label>

              <input
                id="contact-first-name"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className={styles.input}
                placeholder="First Name"
                autoComplete="given-name"
                aria-invalid={fieldError.field === "firstName"}
                aria-describedby={
                  fieldError.field === "firstName"
                    ? "contact-first-name-error"
                    : undefined
                }
                required
              />

              {fieldError.field === "firstName" && (
                <FieldError
                  id="contact-first-name-error"
                  message={fieldError.message}
                />
              )}
            </div>

            <div className={styles.field}>
              <label
                htmlFor="contact-last-name"
                className={styles.visuallyHidden}
              >
                Last Name
              </label>

              <input
                id="contact-last-name"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className={styles.input}
                placeholder="Last Name"
                autoComplete="family-name"
                aria-invalid={fieldError.field === "lastName"}
                aria-describedby={
                  fieldError.field === "lastName"
                    ? "contact-last-name-error"
                    : undefined
                }
                required
              />

              {fieldError.field === "lastName" && (
                <FieldError
                  id="contact-last-name-error"
                  message={fieldError.message}
                />
              )}
            </div>
          </div>

          {/* Lead type */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label
                htmlFor="contact-user-type"
                className={styles.visuallyHidden}
              >
                I&apos;m a
              </label>

              <div className={styles.selectWrapper}>
                <select
                  id="contact-user-type"
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  className={styles.select}
                  aria-invalid={fieldError.field === "userType"}
                  aria-describedby={
                    fieldError.field === "userType"
                      ? "contact-user-type-error"
                      : undefined
                  }
                  required
                >
                  <option value="" disabled>
                    I&apos;m a
                  </option>

                  <option value="broker-agent">Broker</option>

                  <option value="buyer-investor">Buyer</option>
                </select>
              </div>

              {fieldError.field === "userType" && (
                <FieldError
                  id="contact-user-type-error"
                  message={fieldError.message}
                />
              )}
            </div>
          </div>

          {/* International telephone field */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="contact-phone" className={styles.visuallyHidden}>
                Mobile Phone
              </label>

              <PhoneInput
                id="contact-phone"
                name="phone"
                className={styles.phoneInput}
                value={formData.phone}
                onChange={handlePhoneChange}
                flags={flags}
                defaultCountry="AE"
                international
                countryCallingCodeEditable={false}
                placeholder="Mobile Phone"
                autoComplete="tel"
                aria-invalid={fieldError.field === "phone"}
                aria-describedby={
                  fieldError.field === "phone"
                    ? "contact-phone-error"
                    : undefined
                }
                required
              />

              {fieldError.field === "phone" && (
                <FieldError
                  id="contact-phone-error"
                  message={fieldError.message}
                />
              )}
            </div>
          </div>

          {/* Email */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="contact-email" className={styles.visuallyHidden}>
                Email
              </label>

              <input
                id="contact-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="Email"
                autoComplete="email"
                inputMode="email"
                aria-invalid={fieldError.field === "email"}
                aria-describedby={
                  fieldError.field === "email"
                    ? "contact-email-error"
                    : undefined
                }
                required
              />

              {fieldError.field === "email" && (
                <FieldError
                  id="contact-email-error"
                  message={fieldError.message}
                />
              )}
            </div>
          </div>

          {/* Campaign tracking fields */}
          <input
            type="hidden"
            name="utm_source"
            value={trackingData.utm_source}
          />

          <input
            type="hidden"
            name="utm_medium"
            value={trackingData.utm_medium}
          />

          <input
            type="hidden"
            name="utm_campaign"
            value={trackingData.utm_campaign}
          />

          <input
            type="hidden"
            name="utm_content"
            value={trackingData.utm_content}
          />

          <input type="hidden" name="utm_term" value={trackingData.utm_term} />

          <input
            type="hidden"
            name="utm_referrer"
            value={trackingData.utm_referrer}
          />

          <input type="hidden" name="page_url" value={trackingData.page_url} />

          <input
            type="hidden"
            name="landing_page_url"
            value={trackingData.landing_page_url}
          />

          <input type="hidden" name="gclid" value={trackingData.gclid} />

          <input type="hidden" name="fbclid" value={trackingData.fbclid} />

          <input type="hidden" name="msclkid" value={trackingData.msclkid} />

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            <span>{isSubmitting ? "Submitting..." : submitButtonLabel}</span>

            <span className={styles.submitIcon} aria-hidden="true">
              →
            </span>
          </button>

          <p className={styles.consent}>
            By submitting this form, you agree to our{" "}
            <a href="/terms" className={styles.consentLink}>
              Terms of Use
            </a>{" "}
            and{" "}
            <a href="/privacy" className={styles.consentLink}>
              Privacy Policy.
            </a>{" "}
            You consent to Refine contacting you about Movenpick and future
            opportunities by phone, email, or WhatsApp. .
          </p>

          {/* <p className={styles.consent}>
            You consent to Refine contacting you about Movenpick and future
            opportunities by phone, email, or WhatsApp.
          </p> */}

          <p
            className={styles.status}
            data-status={statusType}
            aria-live="polite"
            aria-atomic="true"
          >
            {status}
          </p>
        </form>
      </div>
    </section>
  );
}
