import { useEffect, useRef, useState } from "react";
import { fetchMusicConfig, searchMusic } from "../api.js";
import { Close, Search } from "./Icons.jsx";
import YouTubePlayer from "./YouTubePlayer.jsx";

// Each mood has several videos that were confirmed to actually start playing
// inside Sukun (real YouTube player on a phone, not just the API's "embeddable"
// flag, which misses label blocks). If one refuses, the next is tried silently.
const v = (id, title) => ({ id, title });
export const MUSIC_MOODS = [
  { key: "calm", emoji: "🌊", label: "Calm", ytm: "peaceful piano relaxing music", videos: [
    v("77ZozI0rw7w", "Relaxing Piano & Water Sounds"), v("3NycM9lYdRI", "Relaxing Piano Music"),
    v("lCOF9LN_Zxs", "Beautiful Piano Music"), v("szWX1HhMZvI", "Relaxing Piano Music")] },
  { key: "uplift", emoji: "🌤️", label: "Uplift", ytm: "feel good mood booster songs", videos: [
    v("hlWiI4xVXKY", "Sunny Mornings"), v("z7LTuVtKdZM", "Happy Upbeat Instrumental"),
    v("CYRNki8GpA4", "Light & Feel-Good Grooves"), v("Tmtfhud4cUE", "Upbeat Instrumental Music")] },
  { key: "happy", emoji: "😊", label: "Happy", ytm: "happy upbeat songs playlist", videos: [
    v("mmqS75jUhW8", "Positive Vibes Only"), v("RIu4vp_PuXU", "Energetic Happy Upbeat Music"),
    v("DC7Y6sC7Ae4", "1 Hour Upbeat Music"), v("tRPTCGA5uiY", "Feel Good Beat")] },
  { key: "unwind", emoji: "🍃", label: "Unwind", ytm: "calming acoustic songs", videos: [
    v("j4OuCMnY43E", "Relaxing Acoustic Guitar"), v("JsZqwu-njOg", "Peaceful Acoustic Guitar"),
    v("f-i_nJLG2Is", "Relaxing Guitar for Stress Relief"), v("RYRISU5pZkA", "Relaxing Lo-fi Guitar")] },
  { key: "meditate", emoji: "🧘", label: "Meditate", ytm: "meditation music relaxing", videos: [
    v("Xbjzkbi4OcA", "Zen Meditation & Nature Sounds"), v("l_RteEP_pOI", "Deep Meditative State"),
    v("caAVbyTCptw", "Serene Meditative Music"), v("60Gnd8Wy0gE", "10 Minute Deep Meditation")] },
  { key: "focus", emoji: "🎧", label: "Focus", ytm: "lofi beats to relax study", videos: [
    v("lTRiuFIWV54", "1 A.M Study Session (lofi)"), v("n61ULEU7CO0", "Best of Lofi Hip Hop"),
    v("PNwplS-YFzU", "Lofi Study Beats"), v("CFGLoQIhmow", "Lofi Hip Hop Mix")] },
  { key: "sleep", emoji: "🌙", label: "Sleep", ytm: "sleep music calm", videos: [
    v("1ZYbU82GVz4", "Flying: Relaxing Sleep Music"), v("xQ6xgDI7Whc", "Delta Waves Sleep Music"),
    v("yGi1MePEN-k", "Deep Sleep Music"), v("vlwHETkYB1Y", "Soft Bansuri Flute for Sleep")] },
];

const STATE_KEY = "sukun-music-v4";
const DEFAULT_STATE = { mood: null, moodIdx: 0, track: null }; // track: { video, list, title }

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY));
    if (s && typeof s === "object") return { ...DEFAULT_STATE, ...s };
  } catch { /* ignore */ }
  return DEFAULT_STATE;
}

/** Extract a YouTube video or playlist from any youtube.com / youtu.be / music.youtube.com link. */
export function parseYouTube(input) {
  const text = input.trim();
  if (!/youtu\.?be/i.test(text)) return null;
  let url;
  try {
    url = new URL(text.startsWith("http") ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const idOk = (id) => /^[\w-]{11}$/.test(id || "");
  const list = url.searchParams.get("list");

  let video = null;
  if (host === "youtu.be") video = url.pathname.slice(1, 12);
  else if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") video = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
      if (m) video = m[1];
    }
  } else {
    return null;
  }

  if (idOk(video)) return { video, list: list && /^[\w-]+$/.test(list) ? list : null };
  if (list && /^[\w-]+$/.test(list)) return { video: null, list };
  return null;
}

function watchUrl({ video, list }) {
  if (video) return `https://www.youtube.com/watch?v=${video}${list ? `&list=${list}` : ""}`;
  return `https://www.youtube.com/playlist?list=${list}`;
}

/**
 * Docked YouTube music panel. It stays mounted while collapsed so music keeps
 * playing as you chat; `open` only controls whether the panel is expanded.
 */
export default function MusicPlayer({ open, onToggle }) {
  const [state, setState] = useState(loadState);
  const [canSearch, setCanSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = no search yet
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false); // nothing left to try for this pick
  const abortRef = useRef(null);
  const queueRef = useRef(null); // what to try next if the current video refuses to play

  // After a reload, a remembered mood still gets its backup videos.
  if (queueRef.current === null) {
    const m = !state.track && MUSIC_MOODS.find((x) => x.key === state.mood);
    const idx = state.moodIdx || 0;
    queueRef.current = m ? m.videos.map((_, i) => (idx + i) % m.videos.length).slice(1) : [];
  }

  useEffect(() => { fetchMusicConfig().then((c) => setCanSearch(!!c.youtube)); }, []);

  const update = (patch) =>
    setState((s) => {
      const next = { ...s, ...patch };
      try { localStorage.setItem(STATE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });

  const mood = MUSIC_MOODS.find((m) => m.key === state.mood);
  const fromMood = !state.track && mood;
  const moodVideo = mood && mood.videos[(state.moodIdx || 0) % mood.videos.length];
  const playing = state.track || (moodVideo && { video: moodVideo.id, list: null, title: `${mood.label} · ${moodVideo.title}` });

  function pickMood(key) {
    const m = MUSIC_MOODS.find((x) => x.key === key);
    // Start somewhere random for variety; the rest of the mood's videos are backups.
    const start = Math.floor(Math.random() * m.videos.length);
    queueRef.current = m.videos.map((_, i) => (start + i) % m.videos.length).slice(1);
    setFailed(false);
    update({ mood: key, moodIdx: start, track: null });
  }

  function play(item, index) {
    queueRef.current = results ? results.slice(index + 1) : [];
    setFailed(false);
    update({ track: { video: item.id, list: null, title: item.title } });
    setResults(null);
  }

  // Called by the YouTube player when a video refuses to play (e.g. a label
  // blocks it on other websites). Quietly move on to the next option.
  function handlePlayerError() {
    const next = queueRef.current.shift();
    if (next === undefined) {
      setFailed(true);
    } else if (typeof next === "number") {
      update({ moodIdx: next });
    } else {
      update({ track: { video: next.id, list: null, title: next.title } });
    }
  }

  async function submit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setError("");

    // A pasted YouTube / YouTube Music link plays directly.
    const link = parseYouTube(q);
    if (link) {
      queueRef.current = [];
      setFailed(false);
      update({ track: { ...link, title: "Your YouTube link" } });
      setQuery("");
      setResults(null);
      return;
    }
    if (!canSearch) {
      setError("Search isn't set up yet. You can still paste a YouTube link.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    try {
      const data = await searchMusic(q, controller.signal);
      if (data.error) { setError(data.error); setResults(null); }
      else setResults(data.results);
    } catch { /* aborted */ } finally {
      if (abortRef.current === controller) setSearching(false);
    }
  }

  if (!open && !playing) return null;

  const placeholder = canSearch ? "Search a song, artist or mood…" : "Paste a YouTube / YouTube Music link";

  return (
    <aside className={`music ${open ? "open" : "collapsed"}`} aria-label="Music">
      {!open && playing && (
        <button className="music-pill" onClick={onToggle} title="Show music player">
          <span className="eq" aria-hidden="true"><i /><i /><i /></span>
          <span className="music-pill-title">{playing.title}</span>
        </button>
      )}

      <div className="music-panel" hidden={!open}>
        <div className="music-head">
          <div>
            <h3>Music for your mood</h3>
            <p>Search a song or pick a vibe. It keeps playing while you chat.</p>
          </div>
          <button className="icon-btn small" onClick={onToggle} aria-label="Minimise music player"><Close /></button>
        </div>

        <form className="music-search" onSubmit={submit} role="search">
          <Search className="music-search-icon" width="16" height="16" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(""); }}
            placeholder={placeholder}
            aria-label={placeholder}
            maxLength={300}
          />
          <button type="submit" disabled={!query.trim() || searching}>{searching ? "…" : "Go"}</button>
        </form>
        {error && <p className="music-error">{error}</p>}

        {results ? (
          <div className="music-results">
            <div className="music-results-head">
              <span>{results.length ? `Results for “${query.trim()}”` : "No results. Try different words."}</span>
              <button onClick={() => setResults(null)}>Clear</button>
            </div>
            <ul>
              {results.map((r, i) => (
                <li key={r.id}>
                  <button onClick={() => play(r, i)}>
                    {r.image ? <img src={r.image} alt="" loading="lazy" /> : <span className="music-thumb" />}
                    <span className="music-result-text">
                      <strong>{r.title}</strong>
                      <span>{r.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="music-moods">
            {MUSIC_MOODS.map((m) => (
              <button
                key={m.key}
                className={fromMood && m.key === state.mood ? "active" : ""}
                onClick={() => pickMood(m.key)}
                aria-pressed={!!fromMood && m.key === state.mood}
              >
                <span>{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
        )}

        {playing ? (
          <>
            {failed ? (
              <p className="music-unavailable">
                Couldn't play that one here.{" "}
                <a href={watchUrl(playing)} target="_blank" rel="noreferrer">Open on YouTube</a>
                {fromMood ? " or pick another mood." : " or try another song."}
              </p>
            ) : (
              <YouTubePlayer
                key={`${playing.video}-${playing.list}`}
                video={playing.video}
                list={playing.list}
                title={playing.title}
                onError={handlePlayerError}
              />
            )}
            {fromMood && (
              <div className="music-links">
                <a href={`https://music.youtube.com/search?q=${encodeURIComponent(mood.ytm)}`} target="_blank" rel="noreferrer" className="music-link ytm">
                  More “{mood.label}” music on YouTube Music
                </a>
              </div>
            )}
          </>
        ) : (
          !results && <p className="music-empty">Search for a song or choose a mood to start listening.</p>
        )}
      </div>
    </aside>
  );
}
