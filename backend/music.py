"""YouTube song search for the Music panel.

The browser calls our backend, and the backend calls YouTube, so the API key
never reaches the browser. Search is enabled when YOUTUBE_API_KEY is set in
.env (Google Cloud -> enable "YouTube Data API v3" -> Credentials -> API key).
"""

import html
import logging
import os

import httpx

log = logging.getLogger("sukun")

_TIMEOUT = httpx.Timeout(10.0)


class MusicError(Exception):
    """Error with a message that is safe to show to the user."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def config() -> dict:
    return {"youtube": bool(os.getenv("YOUTUBE_API_KEY"))}


async def search_youtube(query: str) -> list[dict]:
    if not os.getenv("YOUTUBE_API_KEY"):
        raise MusicError("YouTube search isn't set up yet.", 503)

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "videoEmbeddable": "true",  # only videos that can play inside Sukun
                    "videoCategoryId": "10",    # Music
                    "safeSearch": "strict",
                    "maxResults": 15,  # some get filtered out below
                    "key": os.getenv("YOUTUBE_API_KEY"),
                    **({"regionCode": os.getenv("MUSIC_REGION").strip().upper()}
                       if (os.getenv("MUSIC_REGION") or "").strip() else {}),
                },
            )
    except httpx.HTTPError as e:
        log.error("YouTube search network error: %s", e)
        raise MusicError("Couldn't reach YouTube. Check your connection and try again.")

    if resp.status_code in (400, 403):
        reason = ""
        try:
            reason = resp.json()["error"]["errors"][0]["reason"]
        except Exception:
            pass
        log.error("YouTube search failed %s (%s): %s", resp.status_code, reason, resp.text[:300])
        if reason in ("quotaExceeded", "dailyLimitExceeded"):
            raise MusicError("YouTube search has hit today's free limit. It resets at midnight Pacific time.", 429)
        raise MusicError("YouTube search isn't configured correctly (check YOUTUBE_API_KEY).", 503)
    if resp.status_code >= 400:
        log.error("YouTube search failed %s: %s", resp.status_code, resp.text[:300])
        raise MusicError("YouTube search failed. Please try again.")

    results = []
    for item in resp.json().get("items", []):
        vid = (item.get("id") or {}).get("videoId")
        sn = item.get("snippet") or {}
        if not vid:
            continue
        thumbs = sn.get("thumbnails") or {}
        results.append({
            "id": vid,
            # YouTube returns HTML-escaped titles (&amp;, &#39; ...)
            "title": html.unescape(sn.get("title", "")),
            "subtitle": html.unescape(sn.get("channelTitle", "")),
            "image": (thumbs.get("default") or thumbs.get("medium") or {}).get("url"),
        })
    return await _drop_unplayable(results)


async def _drop_unplayable(results: list[dict]) -> list[dict]:
    """Remove videos YouTube says can't be embedded, aren't public, are age-restricted,
    or are blocked in MUSIC_REGION (if set). Costs 1 quota unit. Some label blocks
    aren't visible here; the player handles those by skipping to the next result."""
    if not results:
        return results
    region = (os.getenv("MUSIC_REGION") or "").strip().upper()
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={
                    "part": "status,contentDetails",
                    "id": ",".join(r["id"] for r in results),
                    "key": os.getenv("YOUTUBE_API_KEY"),
                },
            )
        resp.raise_for_status()
        info = {v["id"]: v for v in resp.json().get("items", [])}
    except (httpx.HTTPError, ValueError) as e:
        log.warning("Couldn't check video playability, returning unfiltered results: %s", e)
        return results

    def playable(vid: str) -> bool:
        v = info.get(vid)
        if not v:
            return False
        st, cd = v.get("status", {}), v.get("contentDetails", {})
        if not st.get("embeddable") or st.get("privacyStatus") != "public":
            return False
        if (cd.get("contentRating") or {}).get("ytRating") == "ytAgeRestricted":
            return False
        rr = cd.get("regionRestriction") or {}
        if region and (("allowed" in rr and region not in rr["allowed"]) or region in rr.get("blocked", [])):
            return False
        return True

    return [r for r in results if playable(r["id"])]
