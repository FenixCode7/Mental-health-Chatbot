# Sukun: a supportive mental health chatbot

A Python (FastAPI) + React chat app where people can talk through stress, anxiety or low mood.
Replies stream in as they're written, from Groq (free tier, gpt-oss-120b) or Claude. Set
`LLM_PROVIDER` in `backend/.env` to choose; the provider code is in [backend/providers.py](backend/providers.py).

> Sukun is a supportive companion, not a therapist, diagnostic tool or crisis service.

## Features

- Empathetic, short conversational replies, guided by a safety-focused system prompt ([backend/prompts.py](backend/prompts.py))
- Crisis detection: messages that mention suicide or self-harm open a crisis-resources panel ([backend/safety.py](backend/safety.py)). A **Get help now** button keeps it one click away at all times.
- Welcome screen with mood check-ins and conversation starters
- Formatted replies, light/dark mode, and a Stop button while Sukun is replying
- Guided breathing (box, 4-7-8, calm) and a 5-4-3-2-1 grounding exercise
- Mood music: a docked YouTube player with 7 mood picks that keeps playing while you chat. Search any song (needs a free YouTube API key, see below) or paste a YouTube / YouTube Music link.
- Chat history saved in the browser (localStorage); nothing is stored on the server

## Setup

You need Python 3.10+, Node 18+, and a free Groq API key from https://console.groq.com/keys
(or an Anthropic key, with `LLM_PROVIDER=claude`).

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # then put your key in .env
uvicorn app:app --reload --port 8000
```

### 2. Frontend (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## How it works

```
React (Vite, :5173) --POST /api/chat--> FastAPI (:8000) --stream--> Claude API
        ^                                   |
        +------ Server-Sent Events ---------+   events: crisis, delta, done, error
```

The frontend sends the conversation each turn; the backend runs crisis detection on the latest
message, then streams Claude's reply back token by token.

## Customising

- **Crisis contacts**: edit `CRISIS_RESOURCES` in [backend/safety.py](backend/safety.py) for your region.
- **Personality and rules**: edit [backend/prompts.py](backend/prompts.py).
- **Model**: set `CLAUDE_MODEL` in `.env`.

## Before going live with real users

- Have a mental health professional review the prompt, the crisis flow and the resources.
- Add authentication and rate limiting to `/api/chat` so others can't run up your API bill.
- Add a privacy policy; conversations are sent to Anthropic's API to generate replies.
- Test the crisis flow with many phrasings; keyword detection is a safety net and misses things.

## Enabling song search (optional, free)

In https://console.cloud.google.com create a project, enable **YouTube Data API v3**, then
*Credentials → Create credentials → API key*. Put it in `backend/.env` as `YOUTUBE_API_KEY=` and
restart the backend. The free quota allows about 100 searches per day.

The key stays on the server: the browser calls `/api/music/search` and the backend calls YouTube.

## Deploying (Render backend + Vercel frontend)

**Backend on Render**
1. On https://dashboard.render.com choose **New → Blueprint**, connect this GitHub repo.
   Render reads [render.yaml](render.yaml) and creates the `sukun-api` web service (free plan).
2. Fill in the secrets it asks for: `GROQ_API_KEY`, `YOUTUBE_API_KEY`, and `ALLOWED_ORIGINS`
   (your Vercel URL, e.g. `https://your-app.vercel.app`, no trailing slash).
3. After the deploy, open `https://<service>.onrender.com/api/health`; it should say `"status":"ok"`.

**Frontend on Vercel**
1. Project settings → **Root Directory** = `frontend` (framework: Vite).
2. **Environment Variables** → `VITE_API_URL` = your Render URL, e.g. `https://sukun-api.onrender.com`.
3. Redeploy (Vite bakes the variable in at build time).

The free Render plan sleeps after ~15 minutes idle; the first request afterwards can take up to a minute.
