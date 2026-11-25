import { useState } from "react";
import { Close } from "./Icons.jsx";

const STEPS = [
  { n: 5, sense: "see", text: "Look around. Name five things you can see. Notice their colours and shapes." },
  { n: 4, sense: "feel", text: "Notice four things you can feel: your feet on the floor, the fabric of your clothes, the air on your skin." },
  { n: 3, sense: "hear", text: "Listen closely. What are three sounds you can hear, near or far?" },
  { n: 2, sense: "smell", text: "Find two things you can smell. If nothing comes, think of two smells you love." },
  { n: 1, sense: "taste", text: "Notice one thing you can taste, or take a slow sip of water." },
];

export default function GroundingExercise({ onClose }) {
  const [step, setStep] = useState(0);
  const done = step >= STEPS.length;
  const s = STEPS[step];

  return (
    <div className="overlay" onClick={onClose}>
      <section className="modal grounding" role="dialog" aria-labelledby="ground-title" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close"><Close /></button>
        <h2 id="ground-title">5-4-3-2-1 grounding</h2>
        <p className="muted">Bring yourself back to the present moment, one sense at a time.</p>

        <div className="steps" aria-hidden="true">
          {STEPS.map((x, i) => (
            <span key={x.n} className={i < step ? "done" : i === step ? "current" : ""}>{x.n}</span>
          ))}
        </div>

        {done ? (
          <div className="ground-card">
            <strong className="ground-big">🌿</strong>
            <p>Well done. Take one slow breath and notice how you feel now, even a small change counts.</p>
          </div>
        ) : (
          <div className="ground-card" key={step}>
            <strong className="ground-big">{s.n}</strong>
            <span className="ground-sense">things you can {s.sense}</span>
            <p>{s.text}</p>
          </div>
        )}

        <div className="row">
          {step > 0 && !done && <button className="btn-secondary" onClick={() => setStep(step - 1)}>Back</button>}
          {done ? (
            <>
              <button className="btn-secondary" onClick={() => setStep(0)}>Start again</button>
              <button className="btn-primary" onClick={onClose}>Back to chat</button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setStep(step + 1)}>
              {step === STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
