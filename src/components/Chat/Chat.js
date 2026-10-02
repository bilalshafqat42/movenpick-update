"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PhoneInput, { getCountryCallingCode } from "react-phone-number-input";
/*
 * Bundled flag components rather than the library's default, which fetches
 * each flag as an image from a third-party GitHub Pages host at runtime.
 * That default sends every visitor's IP to a site we don't control, breaks
 * the field if that host goes down, and would need a hole punched in the
 * Content-Security-Policy to work at all. These are inline SVGs (~20KB
 * total) served from our own bundle instead.
 *
 * Contact and ContactPopup were switched over during the August 2026
 * security audit; this component was missed, so its phone field was still
 * requesting flags from the CDN and rendering a broken-image icon once the
 * CSP correctly blocked them.
 */
import flags from "react-phone-number-input/flags";

import { gsap, useGSAP } from "@/lib/gsap";
import { isWithinBusinessHours } from "@/lib/time/businessHours";
import { validateMovenpickLead } from "@/lib/validation/movenpickLead";
import { createWhatsAppLink } from "@/lib/whatsapp/createWhatsAppLink";
import { trackEvent } from "@/lib/analytics";

import ChatMessage from "./ChatMessage";
import {
  BROKER_LINKS,
  BUDGET_BRACKETS,
  BUSINESS_HOURS,
  BUTTON_ORDER_BY_STAGE,
  DEFAULT_CALL_NUMBER,
  DEFAULT_LANGUAGE,
  DEFAULT_PHONE_COUNTRY,
  DEFAULT_WHATSAPP_NUMBER,
  HEADER_SUBTITLE,
  PINNED_PHONE_COUNTRIES,
  ROLES,
  SEARCH_STAGES,
  SLOT_WINDOWS,
  STRINGS,
  TEASER,
  UNIT_TYPES,
  fillTemplate,
  findLabel,
  getCloseVariant,
} from "./chatFlow";

import "react-phone-number-input/style.css";

import styles from "./Chat.module.css";

/*
 * Toggle hover growth is 10%.
 *
 * Applied by releasing a down-scale rather than scaling past 1: the
 * .toggleVisual box is laid out at 110% of the button and held at
 * 1 / 1.1 at rest, so the SVG is rasterised at its largest on-screen
 * size and hover only removes the shrink. Growing past 1 instead
 * would stretch a raster captured at the smaller size and the icon
 * would go soft on the way up. Matches BackToTop.
 */
const TOGGLE_GROWTH = 1.1;
const TOGGLE_REST_SCALE = 1 / TOGGLE_GROWTH;
const TOGGLE_HOVER_SCALE = 1;

const WIDGET_STATE = {
  CLOSED: "closed",
  INTRO: "intro",
  CHAT: "chat",
};

const CHAT_STEP = {
  ROLE: "role",
  SEARCH_STAGE: "search-stage",
  BEDROOMS: "bedrooms",
  BUDGET: "budget",
  COMPANY: "company",
  FIRST_NAME: "first-name",
  LAST_NAME: "last-name",
  PHONE: "phone",
  EMAIL: "email",
  SUBMITTING: "submitting",
  CLOSE: "close",
  ERROR: "error",
};

const TEXT_INPUT_STEPS = [
  CHAT_STEP.COMPANY,
  CHAT_STEP.FIRST_NAME,
  CHAT_STEP.LAST_NAME,
  CHAT_STEP.EMAIL,
];

// Mirrors the spec's step list (welcome, q_intent, q_bedrooms, q_budget,
// [q_company], q_name, q_phone, q_email) for the header progress dots.
// First/last name share one dot since they're one logical "q_name" step.
const BUYER_PROGRESS_STEPS = [
  CHAT_STEP.ROLE,
  CHAT_STEP.SEARCH_STAGE,
  CHAT_STEP.BEDROOMS,
  CHAT_STEP.BUDGET,
  CHAT_STEP.FIRST_NAME,
  CHAT_STEP.PHONE,
  CHAT_STEP.EMAIL,
];

const BROKER_PROGRESS_STEPS = [
  CHAT_STEP.ROLE,
  CHAT_STEP.SEARCH_STAGE,
  CHAT_STEP.BEDROOMS,
  CHAT_STEP.BUDGET,
  CHAT_STEP.COMPANY,
  CHAT_STEP.FIRST_NAME,
  CHAT_STEP.PHONE,
  CHAT_STEP.EMAIL,
];

function createInitialLeadData(projectName) {
  return {
    project: projectName,
    source: "Movenpick Website Chatbot",

    role: "",
    searchStage: "",
    unitType: "",
    budgetBracket: "",

    company: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",

    consent: false,
  };
}

function createMessage({ type = "bot", text, meta }) {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id: randomId,
    type,
    text,
    meta,
  };
}

function buildInitialMessages(strings, fillProject) {
  return [
    createMessage({
      text: fillProject(strings.greetingTitle),
      meta: strings.metaBot,
    }),
    createMessage({ text: strings.greetingSubtitle, meta: strings.metaBot }),
    createMessage({ text: strings.roleQuestion, meta: strings.metaBot }),
  ];
}

function formatSlotWindowLabel(window, language, strings) {
  const formatTime = (time) => {
    const [hour, minute] = time.split(":").map(Number);

    if (language === "ar") {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }

    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;

    return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
  };

  return `${formatTime(window.start)} – ${formatTime(window.end)} ${strings.slotTomorrowLabel}`;
}

export default function Chat({
  agentPhoto = "/images/agent/avatar.avif",
  agentPhotoSquare = "/images/agent/avatar-square.avif",
  projectName = "[Movenpick Project Name]",
  projectShortName = "[Movenpick Project]",
}) {
  const [widgetState, setWidgetState] = useState(WIDGET_STATE.CLOSED);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  const strings = STRINGS[language];
  const isRtl = language === "ar";

  /*
   * Every string in STRINGS/TEASER/WHATSAPP_TEMPLATES that names the
   * project carries a {{project_name}}/{{project_short}} token rather
   * than a hardcoded literal (see chatFlow.js) — this is the one place
   * those tokens get filled in, from the real value marketing sets in
   * the panel (chatAgent.js's project-name/project-short-name fields).
   */
  const fillProject = useCallback(
    (text) =>
      fillTemplate(text, {
        project_name: projectName,
        project_short: projectShortName,
      }),
    [projectName, projectShortName],
  );

  const [chatStep, setChatStep] = useState(CHAT_STEP.ROLE);
  const [leadData, setLeadData] = useState(() =>
    createInitialLeadData(projectName),
  );

  const [messages, setMessages] = useState(() =>
    buildInitialMessages(STRINGS[DEFAULT_LANGUAGE], fillProject),
  );

  const [inputValue, setInputValue] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [reference, setReference] = useState("");

  const [closeVariant, setCloseVariant] = useState("");
  const [slotState, setSlotState] = useState("idle");
  const [confirmedSlotLabel, setConfirmedSlotLabel] = useState("");

  const [showTeaser, setShowTeaser] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);

  const introRef = useRef(null);
  const chatRef = useRef(null);
  const messageListRef = useRef(null);

  const toggleButtonRef = useRef(null);
  const toggleVisualRef = useRef(null);

  const textUsButtonRef = useRef(null);
  const messageInputRef = useRef(null);

  const isFirstRenderRef = useRef(true);
  const previousWidgetStateRef = useRef(WIDGET_STATE.CLOSED);

  const isOpen = widgetState !== WIDGET_STATE.CLOSED;
  const showComposer = TEXT_INPUT_STEPS.includes(chatStep);

  const currentInput = useMemo(() => {
    switch (chatStep) {
      case CHAT_STEP.COMPANY:
        return {
          name: "company",
          type: "text",
          placeholder: strings.companyPlaceholder,
          ariaLabel: strings.companyQuestion,
          autoComplete: "organization",
        };

      case CHAT_STEP.FIRST_NAME:
        return {
          name: "firstName",
          type: "text",
          placeholder: strings.firstNamePlaceholder,
          ariaLabel: strings.firstNameFieldLabel,
          autoComplete: "given-name",
        };

      case CHAT_STEP.LAST_NAME:
        return {
          name: "lastName",
          type: "text",
          placeholder: strings.lastNamePlaceholder,
          ariaLabel: strings.lastNameFieldLabel,
          autoComplete: "family-name",
        };

      case CHAT_STEP.EMAIL:
        return {
          name: "email",
          type: "email",
          placeholder: strings.emailPlaceholder,
          ariaLabel: strings.emailQuestion,
          autoComplete: "email",
          inputMode: "email",
        };

      default:
        return null;
    }
  }, [chatStep, strings]);

  const selectedUnitTypeLabel = useMemo(
    () => findLabel(UNIT_TYPES, leadData.unitType, language),
    [leadData.unitType, language],
  );

  const progressSteps =
    leadData.role === "broker" ? BROKER_PROGRESS_STEPS : BUYER_PROGRESS_STEPS;

  const progressIndex = progressSteps.indexOf(
    chatStep === CHAT_STEP.LAST_NAME ? CHAT_STEP.FIRST_NAME : chatStep,
  );

  const showProgressDots = progressIndex !== -1;

  const appendMessage = useCallback(
    (message) => {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage({
          ...message,
          meta:
            message.meta ??
            (message.type === "visitor"
              ? strings.metaVisitor
              : strings.metaBot),
        }),
      ]);
    },
    [strings],
  );

  const resetChat = useCallback(() => {
    setChatStep(CHAT_STEP.ROLE);
    setLeadData(createInitialLeadData(projectName));
    setMessages(buildInitialMessages(STRINGS[language], fillProject));

    setInputValue("");
    setFieldError("");
    setSubmissionError("");
    setReference("");
    setCloseVariant("");
    setSlotState("idle");
    setConfirmedSlotLabel("");
  }, [language, fillProject, projectName]);

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => (current === "en" ? "ar" : "en"));
  }, []);

  const handleToggleClick = useCallback(() => {
    setWidgetState((currentState) => {
      if (currentState === WIDGET_STATE.CLOSED) {
        trackEvent("chat_open", { trigger: "toggle_button" });
        return WIDGET_STATE.INTRO;
      }
      return WIDGET_STATE.CLOSED;
    });
  }, []);

  const openChat = useCallback(() => {
    if (textUsButtonRef.current === document.activeElement) {
      textUsButtonRef.current.blur();
    }

    trackEvent("chat_open", { trigger: "text_us_button" });
    setWidgetState(WIDGET_STATE.CHAT);
  }, []);

  const closeWidget = useCallback(() => {
    if (
      introRef.current?.contains(document.activeElement) ||
      chatRef.current?.contains(document.activeElement)
    ) {
      document.activeElement instanceof HTMLElement &&
        document.activeElement.blur();
    }

    setWidgetState(WIDGET_STATE.CLOSED);
  }, []);

  const restartChat = useCallback(() => {
    resetChat();
    setWidgetState(WIDGET_STATE.CHAT);
  }, [resetChat]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeWidget();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeWidget]);

  useEffect(() => {
    if (!TEASER.enabled || isOpen || teaserDismissed) {
      return undefined;
    }

    const revealTeaser = () => setShowTeaser(true);

    const timer = window.setTimeout(revealTeaser, TEASER.delaySeconds * 1000);

    const handleScroll = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;

      if (scrollable <= 0) {
        return;
      }

      const scrolledPercent = (window.scrollY / scrollable) * 100;

      if (scrolledPercent >= TEASER.scrollPercent) {
        revealTeaser();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen, teaserDismissed]);

  const dismissTeaser = useCallback((event) => {
    event.stopPropagation();
    setShowTeaser(false);
    setTeaserDismissed(true);
  }, []);

  const handleTeaserClick = useCallback(() => {
    setShowTeaser(false);
    setTeaserDismissed(true);
    setWidgetState(WIDGET_STATE.INTRO);
  }, []);

  useLayoutEffect(() => {
    const previousWidgetState = previousWidgetStateRef.current;

    previousWidgetStateRef.current = widgetState;

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (widgetState === WIDGET_STATE.INTRO) {
      textUsButtonRef.current?.focus();
      return;
    }

    if (widgetState === WIDGET_STATE.CHAT && showComposer) {
      window.requestAnimationFrame(() => {
        messageInputRef.current?.focus();
      });

      return;
    }

    /*
     * Returning focus to the toggle is only correct when the widget
     * has just been closed.
     *
     * This effect also runs on chatStep and showComposer changes, and
     * those settle shortly after mount while the widget has never
     * been opened. Focusing unconditionally left the toggle in
     * :focus-visible from first paint, so it sat there showing its
     * hover artwork instead of its resting one.
     */
    if (
      widgetState === WIDGET_STATE.CLOSED &&
      previousWidgetState !== WIDGET_STATE.CLOSED
    ) {
      toggleButtonRef.current?.focus();
    }
  }, [widgetState, chatStep, showComposer]);

  useEffect(() => {
    if (widgetState !== WIDGET_STATE.CHAT) {
      return;
    }

    const messageList = messageListRef.current;

    if (!messageList) {
      return;
    }

    window.requestAnimationFrame(() => {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, chatStep, widgetState]);

  useGSAP(
    () => {
      const intro = introRef.current;
      const chat = chatRef.current;

      if (!intro || !chat) {
        return undefined;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const showIntro = widgetState === WIDGET_STATE.INTRO;
      const showChat = widgetState === WIDGET_STATE.CHAT;

      gsap.killTweensOf([intro, chat]);

      if (reduceMotion) {
        gsap.set(intro, {
          display: showIntro ? "flex" : "none",
          autoAlpha: showIntro ? 1 : 0,
          y: 0,
          scale: 1,
        });

        gsap.set(chat, {
          display: showChat ? "flex" : "none",
          autoAlpha: showChat ? 1 : 0,
          y: 0,
          scale: 1,
        });

        return undefined;
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      if (showIntro) {
        gsap.set(chat, {
          display: "none",
          autoAlpha: 0,
        });

        gsap.set(intro, {
          display: "flex",
        });

        timeline.fromTo(
          intro,
          {
            autoAlpha: 0,
            y: 24,
            scale: 0.96,
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.42,
          },
        );

        return () => timeline.kill();
      }

      if (showChat) {
        gsap.set(intro, {
          display: "none",
          autoAlpha: 0,
        });

        gsap.set(chat, {
          display: "flex",
        });

        timeline.fromTo(
          chat,
          {
            autoAlpha: 0,
            y: 24,
            scale: 0.96,
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.42,
          },
        );

        return () => timeline.kill();
      }

      timeline
        .to([intro, chat], {
          autoAlpha: 0,
          y: 16,
          scale: 0.96,
          duration: 0.3,
          ease: "power2.in",
        })
        .set([intro, chat], {
          display: "none",
        });

      return () => timeline.kill();
    },
    {
      dependencies: [widgetState],
    },
  );

  /*
   * Hold the toggle artwork at its rest scale from first paint.
   *
   * .toggleVisual is laid out at 110% of the button and scaled back
   * down here, so hover grows it by removing a down-scale rather than
   * stretching past 1. The SVG is therefore rasterised once at its
   * largest on-screen size and stays sharp through the growth.
   */
  useGSAP(() => {
    const visual = toggleVisualRef.current;

    if (!visual) {
      return;
    }

    gsap.set(visual, {
      scale: TOGGLE_REST_SCALE,
    });
  }, []);

  const handleToggleMouseEnter = useCallback(() => {
    const button = toggleButtonRef.current;
    const visual = toggleVisualRef.current;

    if (!button || !visual) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      return;
    }

    gsap.to(button, {
      y: -4,
      duration: 0.35,
      ease: "power3.out",
      overwrite: true,
    });

    gsap.to(visual, {
      y: -2,
      scale: TOGGLE_HOVER_SCALE,
      duration: 0.35,
      ease: "power3.out",
      overwrite: true,
    });
  }, []);

  const handleToggleMouseLeave = useCallback(() => {
    const button = toggleButtonRef.current;
    const visual = toggleVisualRef.current;

    if (!button || !visual) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      return;
    }

    gsap.to(button, {
      y: 0,
      scale: 1,
      duration: 0.4,
      ease: "power3.out",
      overwrite: true,
    });

    gsap.to(visual, {
      y: 0,
      scale: TOGGLE_REST_SCALE,
      duration: 0.4,
      ease: "power3.out",
      overwrite: true,
    });
  }, []);

  const handleRoleSelection = useCallback(
    (role) => {
      setLeadData((currentData) => ({
        ...currentData,
        role: role.id,
      }));

      appendMessage({ type: "visitor", text: role.label[language] });

      appendMessage({
        text:
          role.id === "broker"
            ? fillProject(strings.stageQuestionBroker)
            : strings.stageQuestion,
      });

      setChatStep(CHAT_STEP.SEARCH_STAGE);
    },
    [appendMessage, language, strings, fillProject],
  );

  const handleSearchStageSelection = useCallback(
    (stage) => {
      setLeadData((currentData) => ({
        ...currentData,
        searchStage: stage.id,
      }));

      const isBroker = leadData.role === "broker";

      appendMessage({
        type: "visitor",
        text: isBroker ? stage.brokerLabel[language] : stage.label[language],
      });

      appendMessage({
        text: isBroker
          ? strings.bedroomsQuestionBroker
          : strings.bedroomsQuestion,
      });

      setChatStep(CHAT_STEP.BEDROOMS);
    },
    [appendMessage, language, leadData.role, strings],
  );

  const handleUnitTypeSelection = useCallback(
    (unitType) => {
      setLeadData((currentData) => ({
        ...currentData,
        unitType: unitType.id,
      }));

      appendMessage({ type: "visitor", text: unitType.label[language] });

      appendMessage({
        text:
          leadData.role === "broker"
            ? strings.budgetQuestionBroker
            : strings.budgetQuestion,
      });

      setChatStep(CHAT_STEP.BUDGET);
    },
    [appendMessage, language, leadData.role, strings],
  );

  const handleBudgetSelection = useCallback(
    (budget) => {
      setLeadData((currentData) => ({
        ...currentData,
        budgetBracket: budget.id,
      }));

      appendMessage({ type: "visitor", text: budget.label[language] });

      if (leadData.role === "broker") {
        appendMessage({ text: strings.companyQuestion });
        setChatStep(CHAT_STEP.COMPANY);
        return;
      }

      appendMessage({ text: strings.nameQuestion });
      setChatStep(CHAT_STEP.FIRST_NAME);
    },
    [appendMessage, language, leadData.role, strings],
  );

  const handleTextInputChange = useCallback((event) => {
    setInputValue(event.target.value);
    setFieldError("");
  }, []);

  const handleConsentChange = useCallback((event) => {
    setLeadData((currentData) => ({
      ...currentData,
      consent: event.target.checked,
    }));
    setFieldError("");
  }, []);

  const handlePhoneValueChange = useCallback((value) => {
    setLeadData((currentData) => ({
      ...currentData,
      phone: value ?? "",
    }));
    setFieldError("");
  }, []);

  const handlePinnedCountrySelect = useCallback((countryCode) => {
    setLeadData((currentData) => ({
      ...currentData,
      phone: `+${getCountryCallingCode(countryCode)}`,
    }));
    setFieldError("");
  }, []);

  const handlePhoneContinue = useCallback(() => {
    if (!leadData.consent) {
      setFieldError(strings.consentError);
      return;
    }

    if (!leadData.phone || !/^\+[0-9]{7,15}$/.test(leadData.phone)) {
      setFieldError(strings.phoneError);
      return;
    }

    appendMessage({ type: "visitor", text: leadData.phone });
    setFieldError("");

    appendMessage({ text: strings.emailQuestion });
    setChatStep(CHAT_STEP.EMAIL);
  }, [appendMessage, leadData.consent, leadData.phone, strings]);

  const submitLead = useCallback(
    async (lead) => {
      setSubmissionError("");
      setFieldError("");

      const validationResult = validateMovenpickLead(lead);

      if (!validationResult.success) {
        const firstError =
          Object.values(validationResult.errors)[0] ?? strings.errorFallback;

        setSubmissionError(firstError);
        setChatStep(CHAT_STEP.ERROR);
        return;
      }

      setChatStep(CHAT_STEP.SUBMITTING);

      try {
        const response = await fetch("/api/movenpick-lead", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project: lead.project,
            source: lead.source,
            language,
            intent: lead.role,
            search_stage: lead.searchStage,
            unit_type: lead.unitType,
            budget_bracket: lead.budgetBracket,
            company: lead.company,
            first_name: lead.firstName,
            last_name: lead.lastName,
            phone: lead.phone,
            email: lead.email,
            consent: lead.consent,
            pageUrl: window.location.href,
            submittedAt: new Date().toISOString(),
          }),
        });

        let result;

        try {
          result = await response.json();
        } catch {
          result = null;
        }

        if (!response.ok || !result?.success) {
          throw new Error(result?.message ?? strings.errorFallback);
        }

        const returnedReference = result.reference ?? `MVP-${Date.now()}`;

        setReference(returnedReference);

        const variant = getCloseVariant(
          lead.searchStage,
          isWithinBusinessHours(BUSINESS_HOURS),
        );

        setCloseVariant(variant);
        setSlotState("idle");

        appendMessage({
          text: fillTemplate(strings.thanksLine, {
            first_name: lead.firstName,
          }),
        });

        setChatStep(CHAT_STEP.CLOSE);
      } catch (error) {
        console.error("Movenpick chatbot submission error:", error);

        setSubmissionError(
          error instanceof Error ? error.message : strings.errorFallback,
        );

        setChatStep(CHAT_STEP.ERROR);
      }
    },
    [appendMessage, language, strings],
  );

  const handleTextAnswer = useCallback(
    (event) => {
      event.preventDefault();

      if (!currentInput) {
        return;
      }

      const trimmedValue = inputValue.trim();

      if (chatStep === CHAT_STEP.EMAIL) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
          setFieldError(strings.emailError);
          return;
        }
      } else if (chatStep === CHAT_STEP.COMPANY) {
        if (trimmedValue.length < 2) {
          setFieldError(strings.companyError);
          return;
        }
      } else if (
        chatStep === CHAT_STEP.FIRST_NAME ||
        chatStep === CHAT_STEP.LAST_NAME
      ) {
        if (trimmedValue.length < 2) {
          setFieldError(strings.nameError);
          return;
        }
      }

      appendMessage({ type: "visitor", text: trimmedValue });
      setInputValue("");
      setFieldError("");

      if (chatStep === CHAT_STEP.COMPANY) {
        setLeadData((currentData) => ({
          ...currentData,
          company: trimmedValue,
        }));

        appendMessage({ text: strings.nameQuestion });
        setChatStep(CHAT_STEP.FIRST_NAME);
        return;
      }

      if (chatStep === CHAT_STEP.FIRST_NAME) {
        setLeadData((currentData) => ({
          ...currentData,
          firstName: trimmedValue,
        }));

        appendMessage({ text: strings.lastNameQuestion });
        setChatStep(CHAT_STEP.LAST_NAME);
        return;
      }

      if (chatStep === CHAT_STEP.LAST_NAME) {
        setLeadData((currentData) => ({
          ...currentData,
          lastName: trimmedValue,
        }));

        appendMessage({ text: strings.phoneQuestion });
        setChatStep(CHAT_STEP.PHONE);
        return;
      }

      if (chatStep === CHAT_STEP.EMAIL) {
        const finalLead = { ...leadData, email: trimmedValue };
        setLeadData(finalLead);
        submitLead(finalLead);
      }
    },
    [
      appendMessage,
      chatStep,
      currentInput,
      inputValue,
      leadData,
      strings,
      submitLead,
    ],
  );

  const handleEditDetails = useCallback(() => {
    setLeadData((currentData) => ({
      ...currentData,
      company: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      consent: false,
    }));

    setInputValue("");
    setFieldError("");
    setSubmissionError("");

    if (leadData.role === "broker") {
      appendMessage({ text: strings.companyQuestion });
      setChatStep(CHAT_STEP.COMPANY);
    } else {
      appendMessage({ text: strings.nameQuestion });
      setChatStep(CHAT_STEP.FIRST_NAME);
    }
  }, [appendMessage, leadData.role, strings]);

  const handleRetrySubmit = useCallback(() => {
    submitLead(leadData);
  }, [leadData, submitLead]);

  const handleSlotSelection = useCallback(
    async (slotLabel) => {
      setSlotState("submitting");
      setFieldError("");

      try {
        const response = await fetch("/api/movenpick-lead-slot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reference,
            project: leadData.project,
            slotLabel,
            firstName: leadData.firstName,
            lastName: leadData.lastName,
            phone: leadData.phone,
            email: leadData.email,
            language,
          }),
        });

        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          throw new Error(result?.message ?? strings.errorFallback);
        }

        setConfirmedSlotLabel(slotLabel);
        setSlotState("confirmed");
      } catch (error) {
        console.error("Movenpick chatbot slot booking error:", error);

        setFieldError(strings.errorFallback);
        setSlotState("idle");
      }
    },
    [
      language,
      leadData.email,
      leadData.firstName,
      leadData.lastName,
      leadData.phone,
      leadData.project,
      reference,
      strings,
    ],
  );

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER;
  const callNumber = process.env.NEXT_PUBLIC_CALL_NUMBER || DEFAULT_CALL_NUMBER;

  const closeWhatsappUrl = useMemo(() => {
    if (!whatsappNumber || !closeVariant) {
      return "";
    }

    const isBroker = leadData.role === "broker";
    const templateKey =
      closeVariant === "nurture"
        ? isBroker
          ? "nurture_broker"
          : "nurture"
        : isBroker
          ? "hot_broker"
          : "hot";

    return createWhatsAppLink({
      number: whatsappNumber,
      templateKey,
      language,
      lead: {
        firstName: leadData.firstName,
        unitTypeLabel: selectedUnitTypeLabel,
        company: leadData.company,
      },
      projectName,
    });
  }, [
    closeVariant,
    language,
    leadData.company,
    leadData.firstName,
    leadData.role,
    selectedUnitTypeLabel,
    whatsappNumber,
    projectName,
  ]);

  const callUrl = callNumber ? `tel:${callNumber}` : "";

  const renderChoiceButtons = (items, handler, labelKey = "label") => (
    <div className={styles.choiceGrid}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.choiceButton}
          onClick={() => handler(item)}
        >
          {
            (leadData.role === "broker" && item.brokerLabel
              ? item.brokerLabel
              : item[labelKey])[language]
          }
        </button>
      ))}
    </div>
  );

  const renderPhoneStep = () => (
    <div className={styles.phoneCard}>
      <div className={styles.pinnedCountries}>
        {PINNED_PHONE_COUNTRIES.map((countryCode) => (
          <button
            key={countryCode}
            type="button"
            className={styles.pinnedCountryChip}
            onClick={() => handlePinnedCountrySelect(countryCode)}
          >
            {countryCode}
          </button>
        ))}
      </div>

      <PhoneInput
        className={styles.phoneInput}
        international
        flags={flags}
        defaultCountry={DEFAULT_PHONE_COUNTRY}
        placeholder={strings.phonePlaceholder}
        value={leadData.phone}
        onChange={handlePhoneValueChange}
      />

      <label className={styles.consentInlineRow}>
        <input
          type="checkbox"
          className={styles.consentCheckbox}
          checked={leadData.consent}
          onChange={handleConsentChange}
        />

        <span className={styles.consentText}>{strings.consentText}</span>
      </label>

      <button
        type="button"
        className={styles.continueButton}
        onClick={handlePhoneContinue}
      >
        {strings.continueCta}
      </button>
    </div>
  );

  const renderSmartClose = () => {
    const isBroker = leadData.role === "broker";

    return (
      <div
        className={`${styles.statusCard} ${styles.successCard}`}
        role="status"
        aria-live="polite"
      >
        <span className={styles.successIcon} aria-hidden="true">
          ✓
        </span>

        {closeVariant === "talk_now" ? (
          <>
            <p className={styles.statusText}>
              {isBroker ? strings.talkNowTextBroker : strings.talkNowText}
            </p>

            <div className={styles.closeActions}>
              {(
                BUTTON_ORDER_BY_STAGE[leadData.searchStage] ?? [
                  "call",
                  "whatsapp",
                ]
              ).map((action) =>
                action === "call" ? (
                  <a
                    key="call"
                    href={callUrl || undefined}
                    aria-disabled={!callUrl}
                    className={styles.primaryButton}
                    onClick={() =>
                      trackEvent("call_click", { location: "chat_widget_talk_now" })
                    }
                  >
                    {strings.callButtonLabel}
                  </a>
                ) : (
                  <a
                    key="whatsapp"
                    href={closeWhatsappUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!closeWhatsappUrl}
                    className={styles.whatsappButton}
                    onClick={() =>
                      trackEvent("whatsapp_click", {
                        location: "chat_widget_talk_now",
                      })
                    }
                  >
                    {strings.whatsappButtonLabel}
                  </a>
                ),
              )}
            </div>

            {!callUrl ? (
              <p className={styles.whatsappUnavailable}>
                {strings.callUnavailable}
              </p>
            ) : null}
          </>
        ) : null}

        {closeVariant === "schedule" ? (
          <>
            <p className={styles.statusText}>{strings.scheduleText}</p>

            {slotState === "confirmed" ? (
              <p className={styles.statusText}>
                {fillTemplate(strings.slotConfirmText, {
                  slot_label: confirmedSlotLabel,
                })}
              </p>
            ) : (
              <div className={styles.choiceGrid}>
                {SLOT_WINDOWS.map((window) => (
                  <button
                    key={window.id}
                    type="button"
                    className={styles.choiceButton}
                    disabled={slotState === "submitting"}
                    onClick={() =>
                      handleSlotSelection(
                        formatSlotWindowLabel(window, language, strings),
                      )
                    }
                  >
                    {formatSlotWindowLabel(window, language, strings)}
                  </button>
                ))}

                <button
                  type="button"
                  className={styles.choiceButton}
                  disabled={slotState === "submitting"}
                  onClick={() => handleSlotSelection(strings.slotAnytimeLabel)}
                >
                  {strings.slotAnytimeLabel}
                </button>
              </div>
            )}

            <a
              href={closeWhatsappUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!closeWhatsappUrl}
              className={styles.whatsappButton}
              onClick={() =>
                trackEvent("whatsapp_click", { location: "chat_widget_schedule" })
              }
            >
              {strings.scheduleWhatsappLabel}
            </a>
          </>
        ) : null}

        {closeVariant === "nurture" ? (
          <>
            <p className={styles.statusText}>
              {isBroker
                ? strings.nurtureTextBroker
                : fillProject(strings.nurtureText)}
            </p>

            <a
              href={closeWhatsappUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!closeWhatsappUrl}
              className={styles.whatsappButton}
              onClick={() =>
                trackEvent("whatsapp_click", { location: "chat_widget_nurture" })
              }
            >
              {isBroker
                ? strings.nurtureWhatsappLabelBroker
                : strings.nurtureWhatsappLabel}
            </a>
          </>
        ) : null}

        {!whatsappNumber ? (
          <p className={styles.whatsappUnavailable}>
            {strings.whatsappUnavailable}
          </p>
        ) : null}

        <p className={styles.referenceText}>
          {strings.referenceLabel} <strong>{reference}</strong>
        </p>

        {isBroker ? (
          <div className={styles.brokerLinks}>
            {BROKER_LINKS.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label[language]}
              </a>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className={styles.restartButton}
          onClick={restartChat}
        >
          {strings.startNewEnquiry}
        </button>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (chatStep) {
      case CHAT_STEP.ROLE:
        return renderChoiceButtons(ROLES, handleRoleSelection);

      case CHAT_STEP.SEARCH_STAGE:
        return renderChoiceButtons(SEARCH_STAGES, handleSearchStageSelection);

      case CHAT_STEP.BEDROOMS:
        return renderChoiceButtons(UNIT_TYPES, handleUnitTypeSelection);

      case CHAT_STEP.BUDGET:
        return renderChoiceButtons(BUDGET_BRACKETS, handleBudgetSelection);

      case CHAT_STEP.PHONE:
        return renderPhoneStep();

      case CHAT_STEP.SUBMITTING:
        return (
          <div className={styles.statusCard} role="status" aria-live="polite">
            <span className={styles.loadingSpinner} aria-hidden="true" />

            <p>{strings.submittingText}</p>
          </div>
        );

      case CHAT_STEP.CLOSE:
        return renderSmartClose();

      case CHAT_STEP.ERROR:
        return (
          <div
            className={`${styles.statusCard} ${styles.errorCard}`}
            role="alert"
          >
            <p className={styles.statusTitle}>{strings.errorTitle}</p>

            <p className={styles.statusText}>
              {submissionError || strings.errorFallback}
            </p>

            <div className={styles.errorActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleRetrySubmit}
              >
                {strings.tryAgain}
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleEditDetails}
              >
                {strings.editDetails}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.widget}>
      <div
        ref={introRef}
        className={styles.introCard}
        aria-hidden={widgetState !== WIDGET_STATE.INTRO}
        inert={widgetState !== WIDGET_STATE.INTRO}
      >
        <div className={styles.introPhotoWrapper}>
          <Image
            src={agentPhoto}
            alt={strings.agentName}
            fill
            sizes="320px"
            className={styles.introPhoto}
          />

          <div className={styles.introPhotoOverlay} aria-hidden="true" />

          <span className={styles.onlineBadge}>
            <span className={styles.onlineDot} aria-hidden="true" />
            {strings.onlineBadge}
          </span>

          <div className={styles.introContent}>
            <p className={styles.introTitle}>{strings.introTitle}</p>

            <p className={styles.introSubtitle}>{strings.introSubtitle}</p>

            <button
              ref={textUsButtonRef}
              type="button"
              className={styles.textUsButton}
              onClick={openChat}
              tabIndex={widgetState === WIDGET_STATE.INTRO ? 0 : -1}
            >
              {strings.textUsButton}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={chatRef}
        className={styles.chatPanel}
        dir={isRtl ? "rtl" : "ltr"}
        role="dialog"
        aria-modal="false"
        aria-label="Movenpick enquiry assistant"
        aria-hidden={widgetState !== WIDGET_STATE.CHAT}
        inert={widgetState !== WIDGET_STATE.CHAT}
      >
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderInfo}>
            <span className={styles.avatarWrapper}>
              <Image
                src={agentPhotoSquare}
                alt={strings.agentName}
                fill
                sizes="40px"
                className={styles.avatarImage}
              />
            </span>

            <span className={styles.headerText}>
              <span className={styles.agentName}>{projectName}</span>

              <span className={styles.agentStatus}>
                {HEADER_SUBTITLE[language]}
              </span>

              <span className={styles.headerOnlineStatus}>
                <span className={styles.onlineDot} aria-hidden="true" />
                {strings.onlineBadge}
              </span>
            </span>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.langToggle}
              onClick={toggleLanguage}
              aria-label={
                language === "en" ? "Switch to Arabic" : "Switch to English"
              }
            >
              {/*
               * Google Translate-style icon — two overlapping chips, one
               * per script, rather than text that changes with the
               * current language. Recognizable at a glance regardless of
               * which language is currently active.
               */}
              <svg
                viewBox="0 0 22 20"
                width="20"
                height="18"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="1"
                  width="13"
                  height="13"
                  rx="4"
                  fill="#e3ebf1"
                />
                <text
                  x="7.5"
                  y="8"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="7.5"
                  fontWeight="700"
                  fill="#073d61"
                  fontFamily="Arial, Helvetica, sans-serif"
                >
                  A
                </text>
                <rect
                  x="8"
                  y="6"
                  width="13"
                  height="13"
                  rx="4"
                  fill="#073d61"
                />
                <text
                  x="14.5"
                  y="13"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="8"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  ع
                </text>
              </svg>
            </button>

            <button
              type="button"
              className={styles.closeButton}
              onClick={closeWidget}
              aria-label={strings.closeChatAria}
              tabIndex={widgetState === WIDGET_STATE.CHAT ? 0 : -1}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {showProgressDots ? (
          <div
            className={styles.progressDots}
            role="progressbar"
            aria-valuenow={progressIndex + 1}
            aria-valuemin={1}
            aria-valuemax={progressSteps.length}
          >
            {progressSteps.map((step, index) => (
              <span
                key={step}
                className={
                  index <= progressIndex
                    ? styles.progressDotFilled
                    : styles.progressDot
                }
              />
            ))}
          </div>
        ) : null}

        <div
          ref={messageListRef}
          className={styles.messageList}
          aria-live="polite"
        >
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              type={message.type}
              meta={message.meta}
            >
              {message.text}
            </ChatMessage>
          ))}

          {renderCurrentStep()}

          {fieldError ? (
            <p className={styles.fieldError} role="alert">
              {fieldError}
            </p>
          ) : null}
        </div>

        {showComposer && currentInput ? (
          <form className={styles.composer} onSubmit={handleTextAnswer}>
            <input
              ref={messageInputRef}
              type={currentInput.type}
              name={currentInput.name}
              value={inputValue}
              placeholder={currentInput.placeholder}
              className={styles.composerInput}
              aria-label={currentInput.ariaLabel}
              aria-invalid={Boolean(fieldError)}
              autoComplete={currentInput.autoComplete}
              inputMode={currentInput.inputMode}
              maxLength={120}
              onChange={handleTextInputChange}
              tabIndex={widgetState === WIDGET_STATE.CHAT ? 0 : -1}
            />

            <button
              type="submit"
              className={styles.continueButton}
              tabIndex={widgetState === WIDGET_STATE.CHAT ? 0 : -1}
            >
              {strings.continueCta}
            </button>
          </form>
        ) : null}
      </div>

      {showTeaser && !isOpen ? (
        <div className={styles.teaserBubble} dir={isRtl ? "rtl" : "ltr"}>
          <button
            type="button"
            className={styles.teaserDismiss}
            aria-label={strings.closeChatAria}
            onClick={dismissTeaser}
          >
            ×
          </button>

          <button
            type="button"
            className={styles.teaserText}
            onClick={handleTeaserClick}
          >
            {fillProject(strings.teaserText)}
          </button>
        </div>
      ) : null}

      <button
        ref={toggleButtonRef}
        type="button"
        className={styles.toggleButton}
        data-open={isOpen ? "true" : "false"}
        onClick={handleToggleClick}
        onMouseEnter={handleToggleMouseEnter}
        onMouseLeave={handleToggleMouseLeave}
        aria-label={isOpen ? strings.minimiseChatAria : strings.openChatAria}
        aria-expanded={isOpen}
      >
        <span className={styles.toggleLabel} aria-hidden="true">
          {strings.toggleHoverLabel}
        </span>

        <span
          ref={toggleVisualRef}
          className={styles.toggleVisual}
          aria-hidden="true"
        >
          <span className={styles.lightIcon} />
          <span className={styles.darkIcon} />
          <span className={styles.closeIcon} />
        </span>
      </button>
    </div>
  );
}
