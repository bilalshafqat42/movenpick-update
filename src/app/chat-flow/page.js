import ChatFlowDiagram from "@/components/ChatFlowDiagram/ChatFlowDiagram";

import styles from "./chat-flow.module.css";

export const metadata = {
  title: "Chat Flow | Movenpick",
  description:
    "Internal reference diagram for the Movenpick chatbot conversation flow.",
  robots: {
    index: false,
    follow: false,
  },
};

const CLOSE_RULES = [
  {
    stage: "Actively looking",
    inHours: "Talk now — Call + WhatsApp",
    outOfHours: "Schedule — pick a slot",
  },
  {
    stage: "Shortlisting",
    inHours: "Talk now — WhatsApp + Call (order swapped)",
    outOfHours: "Schedule — pick a slot",
  },
  {
    stage: "Gathering information",
    inHours: "Nurture — WhatsApp only",
    outOfHours: "Nurture — WhatsApp only",
  },
  {
    stage: "Not planning yet",
    inHours: "Nurture — WhatsApp only",
    outOfHours: "Nurture — WhatsApp only",
  },
];

export default function ChatFlowPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>Internal Reference</p>

        <h1 className={styles.heading}>Movenpick Chatbot Flow</h1>

        <p className={styles.description}>
          This traces exactly what the chatbot does today: every question,
          the buyer/broker branch, and the business-hours logic that decides
          how the bot closes.
        </p>

        <div className={styles.diagramCard}>
          <ChatFlowDiagram />
        </div>

        <h2 className={styles.subheading}>How the close variant is decided</h2>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Buying stage</th>
                <th>In business hours (Mon–Fri, 9am–6pm Dubai)</th>
                <th>Outside business hours</th>
              </tr>
            </thead>

            <tbody>
              {CLOSE_RULES.map((row) => (
                <tr key={row.stage}>
                  <td>{row.stage}</td>
                  <td>{row.inHours}</td>
                  <td>{row.outOfHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles.note}>
          Broker replies get broker-specific copy and WhatsApp templates
          throughout, plus two extra links (agency registration, all
          projects) on the close screen. The dashed lines in the diagram are
          the two loops in the flow: retrying a failed submission, and
          starting a brand new enquiry after closing.
        </p>
      </div>
    </main>
  );
}
