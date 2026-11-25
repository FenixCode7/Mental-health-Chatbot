import ReactMarkdown from "react-markdown";
import { Logo } from "./Icons.jsx";

// react-markdown does not render raw HTML, so model output is safe to display.
const components = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
};

export default function Message({ message }) {
  const { role, content, pending, error } = message;
  const isUser = role === "user";

  return (
    <div className={`msg ${role}${error ? " error" : ""}`}>
      {!isUser && <Logo className="msg-avatar" width="30" height="30" />}
      <div className="bubble">
        {pending && !content ? (
          <span className="typing" aria-label="Sukun is typing"><i /><i /><i /></span>
        ) : isUser || error ? (
          <p>{content}</p>
        ) : (
          <ReactMarkdown components={components}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
