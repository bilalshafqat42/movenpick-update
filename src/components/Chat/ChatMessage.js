export default function ChatMessage({ type = "bot", children, meta }) {
  return (
    <div data-message-type={type}>
      <div>{children}</div>

      {meta ? <span>{meta}</span> : null}
    </div>
  );
}
