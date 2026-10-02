"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneInput from "react-phone-number-input";
// Bundled inline-SVG flags instead of the library's default third-party
// image host — see the same import in Contact/ContactClient.js.
import flags from "react-phone-number-input/flags";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { trackEvent } from "@/lib/analytics";

import "react-phone-number-input/style.css";

import { gsap, useGSAP } from "@/lib/gsap";
import styles from "./ContactPopup.module.css";

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

export default function ContactPopupClient({
  eyebrow,
  heading,
  submitButtonLabel,
}) {
  const router = useRouter();

  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const timelineRef = useRef(null);
  const previousOverflowRef = useRef("");

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(initialForm);

  const [trackingData, setTrackingData] = useState(initialTrackingData);

  const [fieldError, setFieldError] = useState({ field: null, message: "" });
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");

  /*
   * Capture UTM parameters and advertising click IDs.
   *
   * The same storage key is used by the main Contact form,
   * so both forms retain the same campaign attribution.
   */
  useEffect(() => {
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
      finalTrackingData = currentPageTracking;
    } else if (hasNewCampaignParameters) {
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
   * Popup entrance and exit animation.
   */
  useGSAP(
    () => {
      const overlay = overlayRef.current;
      const dialog = dialogRef.current;
      const form = formRef.current;

      if (!overlay || !dialog || !form) {
        return;
      }

      const animatedChildren = Array.from(form.children);

      gsap.set(overlay, {
        autoAlpha: 0,
        pointerEvents: "none",
      });

      gsap.set(dialog, {
        opacity: 0,
        scale: 0.96,
        y: 32,
      });

      gsap.set(animatedChildren, {
        opacity: 0,
        y: 22,
      });

      const timeline = gsap.timeline({
        paused: true,

        defaults: {
          ease: "power3.out",
        },

        onStart: () => {
          gsap.set(overlay, {
            pointerEvents: "auto",
          });
        },

        onReverseComplete: () => {
          gsap.set(overlay, {
            pointerEvents: "none",
          });

          setIsOpen(false);
        },
      });

      timeline
        .to(overlay, {
          autoAlpha: 1,
          duration: 0.4,
        })
        .to(
          dialog,
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.65,
          },
          0.08,
        )
        .to(
          animatedChildren,
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.055,
          },
          0.23,
        );

      timelineRef.current = timeline;

      return () => {
        timeline.kill();
        timelineRef.current = null;
      };
    },
    {
      scope: overlayRef,
    },
  );

  const clearStatus = useCallback(() => {
    setStatus("");
    setStatusType("");
  }, []);

  const clearFieldError = useCallback((field) => {
    setFieldError((current) =>
      current.field === field ? { field: null, message: "" } : current,
    );
  }, []);

  const showFieldError = useCallback((field, message) => {
    setFieldError({ field, message });
  }, []);

  const openPopup = useCallback(() => {
    if (isOpen) {
      return;
    }

    previousOverflowRef.current = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    clearStatus();
    setFieldError({ field: null, message: "" });
    setIsSubmitting(false);
    setIsOpen(true);

    requestAnimationFrame(() => {
      timelineRef.current?.restart();
    });
  }, [clearStatus, isOpen]);

  const closePopup = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    document.body.style.overflow = previousOverflowRef.current;

    timelineRef.current?.reverse();
  }, [isSubmitting]);

  /*
   * Any button or link containing data-contact-popup
   * opens this popup.
   */
  useEffect(() => {
    const handleTriggerClick = (event) => {
      const trigger = event.target.closest("[data-contact-popup]");

      if (!trigger) {
        return;
      }

      event.preventDefault();
      openPopup();
    };

    document.addEventListener("click", handleTriggerClick);

    return () => {
      document.removeEventListener("click", handleTriggerClick);
    };
  }, [openPopup]);

  /*
   * Close with the Escape key.
   */
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen && !isSubmitting) {
        closePopup();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);

      document.body.style.overflow = previousOverflowRef.current;
    };
  }, [closePopup, isOpen, isSubmitting]);

  /*
   * Focus the first input after opening.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const firstInput = dialogRef.current?.querySelector(
      'input:not([type="hidden"])',
    );

    const focusTimer = window.setTimeout(() => {
      firstInput?.focus();
    }, 500);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [isOpen]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      closePopup();
    }
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
       * Identifies where the form was submitted.
       */
      form_source: "contact-popup",

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
       * Paid advertising click identifiers.
       */
      gclid: trackingData.gclid,
      fbclid: trackingData.fbclid,
      msclkid: trackingData.msclkid,
    };

    try {
      setIsSubmitting(true);
      clearStatus();

      const response = await fetch("/api/movenpick-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error("Lead submission failed");
      }

      trackEvent("contact_submit", { form_source: "contact_popup" });

      /*
       * Record a basic submission confirmation.
       * Personal lead information is not stored here.
       */
      window.sessionStorage.setItem(
        SUBMISSION_STORAGE_KEY,
        JSON.stringify({
          submitted: true,
          formSource: "contact-popup",
          submittedAt: new Date().toISOString(),
        }),
      );

      setFormData(initialForm);

      /*
       * Restore scrolling before navigating.
       */
      document.body.style.overflow = previousOverflowRef.current;

      /*
       * Redirect after successful submission.
       */
      router.push("/thank-you");
    } catch (error) {
      console.error("Popup contact form submission failed:", error);

      setStatus("We could not submit your request. Please try again.");

      setStatusType("error");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      aria-hidden={!isOpen}
      onMouseDown={handleOverlayClick}
    >
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-popup-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close contact form"
          onClick={closePopup}
          disabled={isSubmitting}
        >
          <span className={styles.closeIcon} aria-hidden="true" />
        </button>

        <form
          ref={formRef}
          className={styles.form}
          onSubmit={handleSubmit}
          noValidate
        >
          {/*
           * One line, matching the Contact section: the eyebrow lives
           * INSIDE the heading rather than above it, so both content
           * fields are kept and simply read together.
           *
           * It also fixes the dialog's accessible name — the h2 is what
           * aria-labelledby points at, so this used to announce itself
           * as just "To Us".
           */}
          <header className={styles.headingGroup}>
            <h2 id="contact-popup-title" className={styles.heading}>
              <span className={styles.eyebrow}>{eyebrow}</span> {heading}
            </h2>
          </header>

          {/* First name and last name */}
          <div className={styles.nameRow}>
            <div className={styles.field}>
              <label
                htmlFor="popup-first-name"
                className={styles.visuallyHidden}
              >
                First Name
              </label>

              <input
                id="popup-first-name"
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
                    ? "popup-first-name-error"
                    : undefined
                }
                required
              />

              {fieldError.field === "firstName" && (
                <FieldError
                  id="popup-first-name-error"
                  message={fieldError.message}
                />
              )}
            </div>

            <div className={styles.field}>
              <label
                htmlFor="popup-last-name"
                className={styles.visuallyHidden}
              >
                Last Name
              </label>

              <input
                id="popup-last-name"
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
                    ? "popup-last-name-error"
                    : undefined
                }
                required
              />

              {fieldError.field === "lastName" && (
                <FieldError
                  id="popup-last-name-error"
                  message={fieldError.message}
                />
              )}
            </div>
          </div>

          {/* Lead type */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label
                htmlFor="popup-user-type"
                className={styles.visuallyHidden}
              >
                I&apos;m a
              </label>

              <div className={styles.selectWrapper}>
                <select
                  id="popup-user-type"
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  className={styles.select}
                  aria-invalid={fieldError.field === "userType"}
                  aria-describedby={
                    fieldError.field === "userType"
                      ? "popup-user-type-error"
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
                  id="popup-user-type-error"
                  message={fieldError.message}
                />
              )}
            </div>
          </div>

          {/* Worldwide phone input */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="popup-phone" className={styles.visuallyHidden}>
                Mobile Phone
              </label>

              <PhoneInput
                id="popup-phone"
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
                  fieldError.field === "phone" ? "popup-phone-error" : undefined
                }
                required
              />

              {fieldError.field === "phone" && (
                <FieldError
                  id="popup-phone-error"
                  message={fieldError.message}
                />
              )}
            </div>
          </div>

          {/* Email */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="popup-email" className={styles.visuallyHidden}>
                Email
              </label>

              <input
                id="popup-email"
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
                  fieldError.field === "email" ? "popup-email-error" : undefined
                }
                required
              />

              {fieldError.field === "email" && (
                <FieldError
                  id="popup-email-error"
                  message={fieldError.message}
                />
              )}
            </div>
          </div>

          {/* Hidden campaign tracking fields */}
          <input type="hidden" name="form_source" value="contact-popup" />

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
      </section>
    </div>
  );
}
