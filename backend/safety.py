"""Lightweight crisis-language detection.

This is a safety net, not a classifier: it errs on the side of showing crisis
resources. The model's own system prompt also handles these situations, so a
miss here does not mean an unsafe reply - it just means the on-screen banner
is not forced open.
"""

import re

_CRISIS_PATTERNS = [
    r"\bkill(ing)?\s+my\s*self\b",
    r"\bkms\b",
    r"\bsuicid(e|al)\b",
    r"\bend(ing)?\s+(my|it)\s+(life|all)\b",
    r"\bend\s+it\s+all\b",
    r"\b(want|wanna|going)\s+to\s+die\b",
    r"\bwish\s+i\s+(was|were)\s+dead\b",
    r"\bbetter\s+off\s+dead\b",
    r"\bno\s+(reason|point)\s+(to|in)\s+(live|living)\b",
    r"\bdon'?t\s+want\s+to\s+(live|be\s+alive|wake\s+up)\b",
    r"\b(cut|cutting|hurt|hurting|harm|harming)\s+my\s*self\b",
    r"\bself[\s-]?harm\b",
    r"\boverdos(e|ing)\b",
    r"\b(kill|hurt)\s+(someone|somebody|him|her|them)\b",
    r"\bnot\s+safe\s+(at\s+home|right\s+now)\b",
]

_CRISIS_RE = re.compile("|".join(_CRISIS_PATTERNS), re.IGNORECASE)


def detect_crisis(text: str) -> bool:
    """Return True if the message contains language suggesting risk of harm."""
    return bool(_CRISIS_RE.search(text))


# Shown by the frontend whenever crisis language is detected (and always
# reachable from the header). Edit for your audience/region.
CRISIS_RESOURCES = [
    {"region": "Emergency", "name": "Local emergency services", "contact": "112 / 911 / 999"},
    {"region": "India", "name": "Tele-MANAS (24/7, free)", "contact": "14416 or 1-800-891-4416"},
    {"region": "United States", "name": "988 Suicide & Crisis Lifeline", "contact": "Call or text 988"},
    {"region": "United Kingdom & Ireland", "name": "Samaritans", "contact": "116 123"},
    {"region": "Worldwide", "name": "Find a Helpline", "contact": "https://findahelpline.com"},
]
