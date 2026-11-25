"""FastAPI backend for the Sukun mental health companion.

Run:  uvicorn app:app --reload --port 8000
"""

import json
import logging
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

import music  # noqa: E402
from providers import ProviderError, get_provider  # noqa: E402  (needs .env loaded first)
from safety import CRISIS_RESOURCES, detect_crisis  # noqa: E402

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sukun")

MAX_HISTORY_MESSAGES = 40
MAX_MESSAGE_CHARS = 4000

provider = get_provider()

app = FastAPI(title="Sukun API")
# Which websites may call this API from the browser, e.g.
# ALLOWED_ORIGINS=https://sukun.vercel.app,http://localhost:5173
ALLOWED_ORIGINS = [
    o.strip().rstrip("/")
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
log.info("CORS allowed origins: %s", ALLOWED_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/")
async def root():
    return {"service": "Sukun API", "health": "/api/health"}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.get("/api/health")
async def health():
    return {"status": "ok", "provider": provider.name, "model": provider.model, "configured": provider.configured}


@app.get("/api/resources")
async def resources():
    return {"resources": CRISIS_RESOURCES}


@app.get("/api/music/config")
async def music_config():
    return music.config()


@app.get("/api/music/search")
async def music_search(q: str = Query(min_length=1, max_length=100)):
    try:
        return {"results": await music.search_youtube(q.strip())}
    except music.MusicError as e:
        return JSONResponse({"error": str(e)}, status_code=e.status)


@app.post("/api/chat")
async def chat(req: ChatRequest):
    history = req.messages[-MAX_HISTORY_MESSAGES:]
    # Conversations must start with a user turn.
    while history and history[0].role != "user":
        history = history[1:]

    latest = history[-1].content if history else ""
    crisis = detect_crisis(latest)

    async def event_stream():
        if crisis:
            yield sse("crisis", {"resources": CRISIS_RESOURCES})
        try:
            async for text in provider.stream_reply([m.model_dump() for m in history]):
                yield sse("delta", {"text": text})
            yield sse("done", {})
        except ProviderError as e:
            yield sse("error", {"message": str(e)})
        except Exception:
            log.exception("Unexpected error while streaming a reply")
            yield sse("error", {"message": "Something went wrong on my side. Please try again."})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
