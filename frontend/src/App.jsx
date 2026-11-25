import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchResources, streamChat } from "./api.js";
import BreathingExercise from "./components/BreathingExercise.jsx";
import CrisisPanel from "./components/CrisisPanel.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import GroundingExercise from "./components/GroundingExercise.jsx";
import Message from "./components/Message.jsx";
import MusicPlayer from "./components/MusicPlayer.jsx";
import Welcome from "./components/Welcome.jsx";
import { Heart, Leaf, Logo, Moon, Music, Plus, Send, Stop, Sun, Wind } from "./components/Icons.jsx";

const STORAGE_KEY = "sukun-chat";
const THEME_KEY = "sukun-theme";

function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

function initialTheme() {
  const saved = load(THEME_KEY, null);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [messages, setMessages] = useState(() => {
    const saved = load(STORAGE_KEY, []);
    return Array.isArray(saved) ? saved.filter((m) => !m.pending) : [];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [resources, setResources] = useState([]);
  const [modal, setModal] = useState(null); // "crisis" | "breathe" | "ground" | null
  const [theme, setTheme] = useState(initialTheme);
  const [musicOpen, setMusicOpen] = useState(false);
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { fetchResources().then(setResources); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);
  useEffect(() => { if (!busy) save(STORAGE_KEY, messages); }, [messages, busy]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save(THEME_KEY, theme);
  }, [theme]);

  // Grow the textarea with its content.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setModal(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const updateLast = (fn) =>
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = fn(next[next.length - 1]);
      return next;
    });

  async function send(text) {
    const content = text.trim();
    if (!content || busy) return;

    const history = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "", pending: true }]);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const payload = history
      .filter((m) => m.content && !m.error)
      .map(({ role, content }) => ({ role, content }));

    try {
      await streamChat(payload, (type, data) => {
        if (type === "delta") updateLast((m) => ({ ...m, content: m.content + data.text }));
        else if (type === "crisis") {
          if (data.resources?.length) setResources(data.resources);
          setModal("crisis");
        } else if (type === "error") updateLast((m) => ({ ...m, content: data.message, error: true }));
      }, controller.signal);
    } catch (err) {
      if (err.name !== "AbortError") {
        updateLast((m) => ({ ...m, content: "Couldn't reach the server. Please try again.", error: true }));
      }
    } finally {
      // Drop an empty reply (e.g. stopped before any text arrived).
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, pending: false } : m));
      });
      setBusy(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function newChat() {
    stop();
    setMessages([]);
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <div className="app">
      <div className="backdrop" aria-hidden="true"><span /><span /><span /></div>

      <header className="header">
        <div className="brand">
          <Logo />
          <div>
            <h1>Sukun</h1>
            <p>A calm space to talk</p>
          </div>
        </div>
        <nav className="header-actions">
          <button className="chip" onClick={() => setModal("breathe")}><Wind /><span>Breathe</span></button>
          <button className="chip" onClick={() => setModal("ground")}><Leaf /><span>Ground</span></button>
          <button className={`chip${musicOpen ? " active" : ""}`} onClick={() => setMusicOpen((o) => !o)}><Music /><span>Music</span></button>
          {!empty && <button className="chip" onClick={newChat}><Plus /><span>New chat</span></button>}
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
          <button className="chip help" onClick={() => setModal("crisis")} aria-label="Get help now">
            <Heart /><span className="help-long">Get help now</span><span className="help-short">Help</span>
          </button>
        </nav>
      </header>

      <main className="chat" aria-live="polite">
        <div className="chat-inner">
          {empty ? (
            <Welcome onSend={send} />
          ) : (
            messages.map((m, i) => <Message key={i} message={m} />)
          )}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="composer-wrap">
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder="Share what's on your mind…"
            rows={1}
            maxLength={4000}
            aria-label="Message"
            autoFocus
          />
          {busy ? (
            <button type="button" className="send stop" onClick={stop} aria-label="Stop reply"><Stop /></button>
          ) : (
            <button type="submit" className="send" disabled={!input.trim()} aria-label="Send"><Send /></button>
          )}
        </form>
        <p className="disclaimer">
          Sukun is an AI companion, not a therapist or emergency service. In a crisis, tap <strong>Get help now</strong>.
        </p>
      </footer>

      <ErrorBoundary fallback={null}>
        <MusicPlayer open={musicOpen} onToggle={() => setMusicOpen((o) => !o)} />
      </ErrorBoundary>

      {modal === "crisis" &&<CrisisPanel resources={resources} onClose={() => setModal(null)} />}
      {modal === "breathe" && <BreathingExercise onClose={() => setModal(null)} />}
      {modal === "ground" && <GroundingExercise onClose={() => setModal(null)} />}
    </div>
  );
}
