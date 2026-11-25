// Where the backend lives. Empty in local dev (Vite proxies /api to :8000);
// on Vercel set VITE_API_URL to the Render URL, e.g. https://sukun-api.onrender.com
const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Streams a chat reply from the backend (Server-Sent Events over a POST).
// Calls onEvent(type, data) for each event: "delta", "crisis", "done", "error".
export async function streamChat(messages, onEvent, signal) {
  let res;
  try {
    res = await fetch(`${API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    // Render's free plan sleeps when idle; the first request can take ~a minute.
    onEvent("error", { message: "Couldn't reach the server. If it was asleep, it's waking up now. Please try again in a minute." });
    return;
  }

  if (!res.ok || !res.body) {
    onEvent("error", { message: "Couldn't reach the server. Is the backend running?" });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let type = "message";
      let data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event: ")) type = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (data) onEvent(type, JSON.parse(data));
    }
  }
}

export async function fetchMusicConfig() {
  try {
    const res = await fetch(`${API}/api/music/config`);
    return await res.json();
  } catch {
    return { youtube: false };
  }
}

// YouTube song search. Returns { results } or { error }.
export async function searchMusic(q, signal) {
  try {
    const res = await fetch(`${API}/api/music/search?q=${encodeURIComponent(q)}`, { signal });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Search failed. Please try again." };
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw err;
    return { error: "Couldn't reach the server. Is the backend running?" };
  }
}

export async function fetchResources() {
  try {
    const res = await fetch(`${API}/api/resources`);
    return (await res.json()).resources;
  } catch {
    return [];
  }
}
