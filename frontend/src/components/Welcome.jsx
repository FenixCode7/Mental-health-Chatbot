import { Lock } from "./Icons.jsx";

const MOODS = [
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Low" },
  { emoji: "😟", label: "Anxious" },
  { emoji: "😣", label: "Stressed" },
  { emoji: "😴", label: "Tired" },
];

const STARTERS = [
  { title: "I need to vent", text: "I just need to get some things off my chest. Can you listen?" },
  { title: "I'm feeling anxious", text: "I'm feeling anxious right now and can't calm down." },
  { title: "I can't sleep", text: "I've been having trouble sleeping. Can you help?" },
  { title: "Help me reframe a thought", text: "I keep having a negative thought about myself. Can you help me look at it differently?" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up?";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Welcome({ onSend }) {
  return (
    <section className="welcome">
      <p className="welcome-eyebrow">{greeting()}</p>
      <h2 className="welcome-title">How are you feeling today?</h2>
      <p className="welcome-sub">
        This is a calm, judgement-free space. Share as much or as little as you like.
      </p>

      <div className="moods" role="group" aria-label="Pick your mood">
        {MOODS.map((m) => (
          <button key={m.label} className="mood" onClick={() => onSend(`I'm feeling ${m.label.toLowerCase()} today.`)}>
            <span className="mood-emoji">{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      <div className="starters">
        {STARTERS.map((s) => (
          <button key={s.title} className="starter" onClick={() => onSend(s.text)}>
            <strong>{s.title}</strong>
            <span>{s.text}</span>
          </button>
        ))}
      </div>

      <p className="privacy-note"><Lock width="14" height="14" /> Your chat stays in this browser. Nothing is saved on our server.</p>
    </section>
  );
}
