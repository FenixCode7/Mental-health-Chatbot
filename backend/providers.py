"""LLM providers. Pick one with LLM_PROVIDER in .env ("groq" or "claude").

Each provider exposes `stream_reply(messages)`, an async generator that yields
text chunks, and raises `ProviderError` with a user-friendly message on failure.
"""

import logging
import os
from typing import AsyncIterator

from prompts import SYSTEM_PROMPT

log = logging.getLogger("sukun")

MAX_TOKENS = 1024

REFUSAL_TEXT = (
    "I'm not able to help with that particular request, but I'm still here for you. "
    "Would you like to tell me more about how you're feeling?"
)


class ProviderError(Exception):
    """Raised with a message that is safe to show to the user."""


# --------------------------------------------------------------------------- Groq

class GroqProvider:
    name = "groq"

    def __init__(self):
        import groq

        self._groq = groq
        self.model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        self.configured = bool(os.getenv("GROQ_API_KEY"))
        # Defer creating the client so a missing key doesn't crash startup.
        self._client = groq.AsyncGroq() if self.configured else None

    async def stream_reply(self, messages: list[dict]) -> AsyncIterator[str]:
        g = self._groq
        if not self._client:
            raise ProviderError("The server isn't configured correctly (missing GROQ_API_KEY).")
        try:
            stream = await self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": SYSTEM_PROMPT}, *messages],
                max_tokens=MAX_TOKENS,
                temperature=0.7,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except g.AuthenticationError:
            log.error("Groq rejected the API key - check GROQ_API_KEY")
            raise ProviderError("The server isn't configured correctly (invalid API key).")
        except g.RateLimitError:
            raise ProviderError("I'm getting a lot of messages right now. Please try again in a moment.")
        except g.NotFoundError:
            log.error("Groq model %r not found - set GROQ_MODEL in .env", self.model)
            raise ProviderError("The server isn't configured correctly (model not found).")
        except g.APIStatusError as e:
            log.error("Groq API error %s: %s", e.status_code, e.message)
            raise ProviderError("Something went wrong on my side. Please try again.")
        except g.APIConnectionError:
            raise ProviderError("I couldn't connect just now. Please check your connection and retry.")


# ------------------------------------------------------------------------- Claude

class ClaudeProvider:
    name = "claude"

    def __init__(self):
        import anthropic

        self._anthropic = anthropic
        self.model = os.getenv("CLAUDE_MODEL", "claude-opus-5-5")
        self.configured = bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))
        self._client = anthropic.AsyncAnthropic()

    async def stream_reply(self, messages: list[dict]) -> AsyncIterator[str]:
        a = self._anthropic
        try:
            async with self._client.beta.messages.stream(
                model=self.model,
                max_tokens=4000,
                system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
                messages=messages,
                output_config={"effort": "medium"},
                # On a safety-classifier decline, the API retries on a fallback model.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            ) as stream:
                async for text in stream.text_stream:
                    yield text
                final = await stream.get_final_message()
            if final.stop_reason == "refusal":
                yield REFUSAL_TEXT
        except a.AuthenticationError:
            log.error("Anthropic rejected the API key - check ANTHROPIC_API_KEY")
            raise ProviderError("The server isn't configured correctly (invalid API key).")
        except a.RateLimitError:
            raise ProviderError("I'm getting a lot of messages right now. Please try again in a moment.")
        except a.APIStatusError as e:
            log.error("Anthropic API error %s: %s", e.status_code, e.message)
            raise ProviderError("Something went wrong on my side. Please try again.")
        except a.APIConnectionError:
            raise ProviderError("I couldn't connect just now. Please check your connection and retry.")
        except TypeError as e:  # SDK raises this when no credentials are configured
            log.error("Claude client misconfigured: %s", e)
            raise ProviderError("The server isn't configured correctly (missing ANTHROPIC_API_KEY).")


# ------------------------------------------------------------------------ factory

_PROVIDERS = {"groq": GroqProvider, "claude": ClaudeProvider}


def get_provider():
    choice = os.getenv("LLM_PROVIDER", "groq").strip().lower()
    if choice not in _PROVIDERS:
        raise ValueError(f"Unknown LLM_PROVIDER {choice!r}; use one of {list(_PROVIDERS)}")
    provider = _PROVIDERS[choice]()
    if not provider.configured:
        log.warning("LLM_PROVIDER=%s but its API key is not set in backend/.env", choice)
    log.info("Using provider %s (model %s)", provider.name, provider.model)
    return provider
