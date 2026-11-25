import { useEffect, useRef } from "react";

// Loads YouTube's official IFrame Player API once, so we can detect videos
// that refuse to play here (label/owner blocks) and react to them.
let apiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => { apiPromise = null; reject(new Error("YouTube player failed to load")); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

// https://developers.google.com/youtube/iframe_api_reference#onError
export function describeYouTubeError(code) {
  if (code === 101 || code === 150) return "The owner of this video doesn't allow it to play on other websites.";
  if (code === 100) return "This video was removed or made private.";
  if (code === 153) return "YouTube couldn't verify this site, so it blocked playback.";
  return "YouTube couldn't play this video here.";
}

export default function YouTubePlayer({ video, list, title, onError }) {
  const hostRef = useRef(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let player = null;
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        const el = document.createElement("div");
        hostRef.current.replaceChildren(el);
        player = new YT.Player(el, {
          width: "100%",
          height: "100%",
          videoId: video || undefined,
          playerVars: {
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
            ...(list ? { list, listType: "playlist" } : {}),
          },
          events: {
            onReady: (e) => e.target.getIframe()?.setAttribute("title", title || "YouTube player"),
            onError: (e) => onErrorRef.current?.(e.data),
          },
        });
      })
      .catch(() => onErrorRef.current?.(-1));

    return () => {
      cancelled = true;
      try { player?.destroy(); } catch { /* already gone */ }
    };
  }, [video, list, title]);

  return <div className="music-embed" ref={hostRef} />;
}
