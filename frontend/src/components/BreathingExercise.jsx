import { useEffect, useState } from "react";
import { Close } from "./Icons.jsx";

const PATTERNS = {
  box: {
    name: "Box breathing",
    hint: "Steadies the mind. Good for stress.",
    phases: [
      { label: "Breathe in", secs: 4, scale: 1 },
      { label: "Hold", secs: 4, scale: 1 },
      { label: "Breathe out", secs: 4, scale: 0.55 },
      { label: "Hold", secs: 4, scale: 0.55 },
    ],
  },
  relax: {
    name: "4-7-8 breathing",
    hint: "Slows things down. Good before sleep.",
    phases: [
      { label: "Breathe in", secs: 4, scale: 1 },
      { label: "Hold", secs: 7, scale: 1 },
      { label: "Breathe out", secs: 8, scale: 0.55 },
    ],
  },
  calm: {
    name: "Calm breathing",
    hint: "Simple and gentle. Good for anxiety.",
    phases: [
      { label: "Breathe in", secs: 4, scale: 1 },
      { label: "Breathe out", secs: 6, scale: 0.55 },
    ],
  },
};

export default function BreathingExercise({ onClose }) {
  const [patternKey, setPatternKey] = useState("box");
  const [running, setRunning] = useState(false);
  const [{ phase, left, cycles }, setTimer] = useState({ phase: 0, left: 0, cycles: 0 });

  const pattern = PATTERNS[patternKey];
  const current = pattern.phases[phase];

  function start() {
    setTimer({ phase: 0, left: pattern.phases[0].secs, cycles: 0 });
    setRunning(true);
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimer((t) => {
        if (t.left > 1) return { ...t, left: t.left - 1 };
        const next = (t.phase + 1) % pattern.phases.length;
        return { phase: next, left: pattern.phases[next].secs, cycles: t.cycles + (next === 0 ? 1 : 0) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, pattern]);

  const scale = running ? current.scale : 0.7;
  const duration = running ? current.secs : 0.6;

  return (
    <div className="overlay" onClick={onClose}>
      <section className="modal breathing" role="dialog" aria-labelledby="breathe-title" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><Close /></button>
        <h2 id="breathe-title">Take a breath</h2>

        <div className="segmented" role="tablist">
          {Object.entries(PATTERNS).map(([key, p]) => (
            <button
              key={key}
              role="tab"
              aria-selected={key === patternKey}
              className={key === patternKey ? "active" : ""}
              onClick={() => { setPatternKey(key); setRunning(false); }}
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="muted">{pattern.hint}</p>

        <div className="breath-stage">
          <div className="breath-ring" />
          <div
            className="breath-orb"
            style={{ transform: `scale(${scale})`, transitionDuration: `${duration}s` }}
          />
          <div className="breath-label" aria-live="polite">
            {running ? (
              <>
                <span>{current.label}</span>
                <strong>{left}</strong>
              </>
            ) : (
              <span>Ready when you are</span>
            )}
          </div>
        </div>

        <p className="muted small">{running ? `Cycles completed: ${cycles}` : "Find a comfortable position. Relax your shoulders."}</p>
        {running ? (
          <button className="btn-secondary wide" onClick={() => setRunning(false)}>Pause</button>
        ) : (
          <button className="btn-primary wide" onClick={start}>Start</button>
        )}
      </section>
    </div>
  );
}
