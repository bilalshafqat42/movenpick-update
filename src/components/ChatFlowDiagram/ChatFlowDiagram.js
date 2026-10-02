"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./ChatFlowDiagram.module.css";

const DIAGRAM_DEFINITION = `flowchart TD
    subgraph phase0["Before the chat opens"]
        A(["Widget closed"]) -->|"15s delay OR scroll past 40%"| T["Teaser bubble<br/>👋 Want the payment plan?"]
        A -->|"click launcher"| B["Intro card → Text Us"]
        T -->|"click"| B
    end

    subgraph phase1["Qualification"]
        B --> C{"Role?"}
        C -->|"Buyer / Investor"| D["Buying stage<br/>actively looking · shortlisting<br/>gathering info · not planning"]
        C -->|"Broker / Agent"| D
        D --> E["Bedrooms<br/>Studio – 3BR+"]
        E --> F["Budget<br/>4 AED brackets"]
    end

    subgraph phase2["Contact details"]
        F --> G{"Broker?"}
        G -->|"Yes"| H["Company name"]
        G -->|"No"| I["First name"]
        H --> I
        I --> J["Last name"]
        J --> K["Phone<br/>+ consent checkbox"]
        K --> L["Email"]
    end

    subgraph phase3["Submit"]
        L --> M[["POST /api/movenpick-lead"]]
        M --> N{"Zapier accepted it?"}
        N -->|"No"| O["Error card<br/>Try Again / Edit Details"]
        O -.->|"Try Again"| M
        O -.->|"Edit Details"| H
    end

    subgraph phase4["Smart close"]
        N -->|"Yes"| P{"Stage + business hours<br/>Asia/Dubai, Mon-Fri 9-6"}
        P -->|"In hours<br/>actively looking / shortlisting"| Q["Talk now<br/>Call + WhatsApp"]
        P -->|"Out of hours<br/>actively looking / shortlisting"| R["Schedule<br/>pick a time slot"]
        P -->|"gathering info / not planning<br/>(any time)"| S["Nurture<br/>WhatsApp brochure / broker pack"]
        R --> R2[["POST /api/movenpick-lead-slot"]]
        R2 --> R3["Booked confirmation<br/>+ WhatsApp fallback"]
    end

    Q --> Z(["Start New Enquiry"])
    R3 --> Z
    S --> Z
    Z -.-> C

    classDef terminal fill:#073d61,stroke:#073d61,color:#ffffff
    classDef decision fill:#ffffff,stroke:#4687E8,stroke-width:1.5px,color:#073d61
    classDef action fill:#ffffff,stroke:#073d61,stroke-width:1px,color:#073d61
    classDef api fill:#ffffff,stroke:#1f7a3f,stroke-width:1.5px,stroke-dasharray: 3 2,color:#1f7a3f
    classDef error fill:#fff8f8,stroke:#9d2929,stroke-width:1.5px,color:#9d2929

    class A,Z terminal
    class C,G,N,P decision
    class D,E,F,H,I,J,K,L,Q,R,R3,S,T,B action
    class M,R2 api
    class O error
`;

let mermaidInitPromise = null;

async function getMermaid() {
  const { default: mermaid } = await import("mermaid");

  if (!mermaidInitPromise) {
    mermaidInitPromise = mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "strict",
      fontFamily: "var(--font-body)",
      themeVariables: {
        primaryColor: "#ffffff",
        primaryTextColor: "#073d61",
        primaryBorderColor: "#073d61",
        lineColor: "#073d61",
        secondaryColor: "#f2f4f6",
        tertiaryColor: "#f2f4f6",
        clusterBkg: "#f7f9fa",
        clusterBorder: "rgba(7, 61, 97, 0.18)",
        edgeLabelBackground: "#ffffff",
        fontFamily: "var(--font-body)",
        fontSize: "13px",
      },
      flowchart: {
        curve: "basis",
        htmlLabels: true,
        subGraphTitleMargin: { top: 6, bottom: 10 },
      },
    });
  }

  return mermaid;
}

export default function ChatFlowDiagram() {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = await getMermaid();
        const { svg } = await mermaid.render(
          "movenpick-chat-flow-diagram",
          DIAGRAM_DEFINITION,
        );

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setStatus("ready");
        }
      } catch (error) {
        console.error("Movenpick chat flow diagram render error:", error);

        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.diagramWrapper}>
      {status === "loading" ? (
        <p className={styles.diagramStatus}>Loading diagram...</p>
      ) : null}

      {status === "error" ? (
        <p className={styles.diagramStatus} role="alert">
          The diagram could not be rendered. Please refresh the page.
        </p>
      ) : null}

      <div
        ref={containerRef}
        className={styles.diagram}
        aria-hidden={status !== "ready"}
      />
    </div>
  );
}
