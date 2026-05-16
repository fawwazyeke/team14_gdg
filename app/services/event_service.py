from __future__ import annotations

import asyncio
import hashlib
import html
import json
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal
from urllib.parse import urljoin

import httpx
from pydantic import BaseModel, Field

City = Literal["seoul", "tokyo"]


class Event(BaseModel):
    id: str
    source: str
    source_event_id: str
    source_url: str
    title: str
    description: str = ""
    summary: str = ""
    country: str
    city: City
    venue_name: str = ""
    address: str = ""
    lat: float | None = None
    lng: float | None = None
    start_at: str
    end_at: str | None = None
    timezone: str
    category: str
    price_text: str = "Check official listing"
    image_url: str = ""
    organizer_name: str = ""
    language_hints: list[str] = Field(default_factory=list)
    social_tags: list[str] = Field(default_factory=list)
    social_score: int
    social_reason: str
    last_fetched_at: str
    raw: dict[str, Any] = Field(default_factory=dict)


class EventRefreshResult(BaseModel):
    from_date: str
    to_date: str
    fetched_at: str
    source_counts: dict[str, int]
    stored: int


class EventQuery(BaseModel):
    city: City | None = None
    category: str | None = None
    q: str | None = None
    free_only: bool = False
    min_social_score: int = 1


SCHEMA_EVENT_SOURCES = [
    {
        "name": "meetup-seoul",
        "city": "seoul",
        "country": "South Korea",
        "timezone": "Asia/Seoul",
        "url": "https://www.meetup.com/find/kr--seoul/",
    },
    {
        "name": "meetup-tokyo",
        "city": "tokyo",
        "country": "Japan",
        "timezone": "Asia/Tokyo",
        "url": "https://www.meetup.com/find/jp--tokyo/",
    },
    {
        "name": "nurio",
        "city": "seoul",
        "country": "South Korea",
        "timezone": "Asia/Seoul",
        "url": "https://nurio.kr/events?lang=en",
    },
]

_events_cache: list[Event] = []
_cache_time: datetime | None = None
_cache_ttl = timedelta(minutes=30)


async def list_events(query: EventQuery) -> list[Event]:
    if cache_is_stale():
        await refresh_events()

    events = _events_cache
    if query.city:
        events = [event for event in events if event.city == query.city]
    if query.category:
        category = query.category.casefold()
        events = [event for event in events if category in event.category.casefold()]
    if query.q:
        term = query.q.casefold()
        events = [event for event in events if term in event_search_text(event)]
    if query.free_only:
        events = [event for event in events if is_free(event.price_text)]
    events = [event for event in events if event.social_score >= query.min_social_score]

    return sorted(events, key=lambda event: (-event.social_score, event.start_at, event.title))


async def get_event(event_id: str) -> Event | None:
    if cache_is_stale():
        await refresh_events()
    return next((event for event in _events_cache if event.id == event_id), None)


async def refresh_events(from_date: str | None = None, to_date: str | None = None) -> EventRefreshResult:
    global _events_cache, _cache_time

    today = date.today()
    from_day = date.fromisoformat(from_date) if from_date else today
    to_day = date.fromisoformat(to_date) if to_date else today + timedelta(days=30)
    fetched_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    timeout = httpx.Timeout(12.0, connect=8.0)
    headers = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,ja;q=0.7,ko;q=0.7",
        "user-agent": "DoHackathon/0.1 (+https://github.com/OmriL997/team14_gdg)",
    }

    async with httpx.AsyncClient(timeout=timeout, headers=headers, follow_redirects=True) as client:
        results = await asyncio.gather(
            *[fetch_source(client, source, from_day, to_day, fetched_at) for source in SCHEMA_EVENT_SOURCES],
            return_exceptions=True,
        )

    source_counts: dict[str, int] = {}
    events: list[Event] = []
    for source, result in zip(SCHEMA_EVENT_SOURCES, results, strict=False):
        if isinstance(result, Exception):
            source_counts[source["name"]] = 0
            continue
        source_counts[source["name"]] = len(result)
        events.extend(result)

    _events_cache = dedupe_events(events)
    _cache_time = datetime.now(timezone.utc)

    return EventRefreshResult(
        from_date=from_day.isoformat(),
        to_date=to_day.isoformat(),
        fetched_at=fetched_at,
        source_counts=source_counts,
        stored=len(_events_cache),
    )


async def fetch_source(
    client: httpx.AsyncClient,
    source: dict[str, str],
    from_day: date,
    to_day: date,
    fetched_at: str,
) -> list[Event]:
    response = await client.get(source["url"])
    response.raise_for_status()
    raw_events = extract_schema_events(response.text)
    return [
        event
        for raw_event in raw_events
        if (event := normalize_schema_event(raw_event, source, fetched_at)) is not None
        and event_in_window(event, from_day, to_day)
    ]


def extract_schema_events(page_html: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for match in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        page_html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        payload = html.unescape(match.group(1).strip())
        if not payload:
            continue
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            continue
        events.extend(schema_events_from_json(data))
    return events


def schema_events_from_json(data: Any) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    if isinstance(data, list):
        for item in data:
            found.extend(schema_events_from_json(item))
    elif isinstance(data, dict):
        schema_type = data.get("@type") or data.get("type")
        if schema_type == "Event" or (isinstance(schema_type, list) and "Event" in schema_type):
            found.append(data)
        for key in ("@graph", "itemListElement", "events"):
            if key in data:
                found.extend(schema_events_from_json(data[key]))
        item = data.get("item")
        if isinstance(item, dict):
            found.extend(schema_events_from_json(item))
    return found


def normalize_schema_event(raw: dict[str, Any], source: dict[str, str], fetched_at: str) -> Event | None:
    title = clean_text(raw.get("name"))
    start_at = parse_datetime(raw.get("startDate"))
    if not title or not start_at:
        return None

    source_url = raw.get("url") or raw.get("@id") or source["url"]
    if isinstance(source_url, list):
        source_url = source_url[0] if source_url else source["url"]
    source_url = urljoin(source["url"], str(source_url))

    description = clean_text(raw.get("description"))
    category = display_category(title, description, raw)
    social_score, social_tags, social_reason = social_fit(title, description, category)

    location = raw.get("location") if isinstance(raw.get("location"), dict) else {}
    geo = location.get("geo") if isinstance(location.get("geo"), dict) else {}
    organizer = raw.get("organizer") if isinstance(raw.get("organizer"), dict) else {}

    return Event(
        id=stable_id(source["name"], source_url, title, start_at),
        source=source["name"],
        source_event_id=stable_id(source["name"], source_url),
        source_url=source_url,
        title=title,
        description=description,
        summary=summarize(title, description, category),
        country=source["country"],
        city=source["city"],  # type: ignore[arg-type]
        venue_name=clean_text(location.get("name")),
        address=schema_address(location.get("address")),
        lat=parse_float(geo.get("latitude")),
        lng=parse_float(geo.get("longitude")),
        start_at=start_at,
        end_at=parse_datetime(raw.get("endDate")),
        timezone=source["timezone"],
        category=category,
        price_text=schema_price(raw),
        image_url=first_image(raw.get("image")),
        organizer_name=clean_text(organizer.get("name")),
        language_hints=infer_language_hints(title, description),
        social_tags=social_tags,
        social_score=social_score,
        social_reason=social_reason,
        last_fetched_at=fetched_at,
        raw=raw,
    )


def event_in_window(event: Event, from_day: date, to_day: date) -> bool:
    try:
        event_day = datetime.fromisoformat(event.start_at.replace("Z", "+00:00")).date()
    except ValueError:
        return False
    return from_day <= event_day <= to_day


def social_fit(title: str, description: str, category: str) -> tuple[int, list[str], str]:
    text = f"{title} {description} {category}".casefold()
    tags: list[str] = []
    score = 2

    keyword_groups = [
        (("language exchange", "언어", "日本語", "english", "conversation", "speaking"), "language-exchange", 2),
        (("beginner", "first time", "newcomer", "easy", "low pressure"), "beginner-friendly", 2),
        (("board game", "games", "drawing", "workshop", "class", "practice"), "activity-based", 1),
        (("walk", "hike", "outdoor", "tour", "culture", "museum", "food"), "culture-or-outdoor", 1),
        (("meetup", "social", "friends", "community", "group", "交流"), "social-group", 1),
        (("free", "no charge", "무료"), "free", 1),
    ]
    for keywords, tag, boost in keyword_groups:
        if any(keyword.casefold() in text for keyword in keywords):
            tags.append(tag)
            score += boost

    if "club" in text or "party" in text:
        score -= 1
    if "concert" in text or "performance" in text:
        score -= 1

    if not tags:
        tags.append("public-event")

    score = max(1, min(5, score))
    if "language-exchange" in tags:
        reason = "Language exchange gives people a clear reason to start small conversations."
    elif "beginner-friendly" in tags:
        reason = "The listing signals a gentler setting for trying a social activity."
    elif "activity-based" in tags:
        reason = "A shared activity can make conversation feel more natural."
    elif "culture-or-outdoor" in tags:
        reason = "Culture and outdoor events create easy prompts for casual conversation."
    else:
        reason = "This is a public event where joining does not require an existing friend group."

    return score, sorted(set(tags)), reason


def display_category(title: str, description: str, raw: dict[str, Any]) -> str:
    schema_type = raw.get("eventType") or raw.get("@type")
    text = f"{title} {description} {schema_type}".casefold()
    return display_category_from_text(text)


def display_category_from_text(text: str) -> str:
    categories = [
        (("language", "english", "korean", "japanese", "conversation", "speaking"), "Language Exchange"),
        (("board game", "game", "drawing", "craft", "workshop", "class"), "Games & Hobbies"),
        (("hike", "walk", "outdoor", "sports", "run"), "Outdoor & Sports"),
        (("food", "cafe", "restaurant", "cooking"), "Food & Cafe"),
        (("museum", "culture", "tradition", "tour", "art"), "Culture"),
        (("tech", "startup", "developer", "ai", "design"), "Tech & Learning"),
    ]
    for keywords, category in categories:
        if any(keyword in text for keyword in keywords):
            return category
    return "Community Events"


def infer_language_hints(title: str, description: str) -> list[str]:
    text = f"{title} {description}".casefold()
    hints: list[str] = []
    if "english" in text:
        hints.append("English")
    if "korean" in text or "한국" in text:
        hints.append("Korean")
    if "japanese" in text or "日本" in text:
        hints.append("Japanese")
    return hints or ["Check listing"]


def summarize(title: str, description: str, category: str) -> str:
    cleaned = clean_text(description)
    if cleaned:
        sentence = re.split(r"(?<=[.!?])\s+", cleaned)[0]
        if 40 <= len(sentence) <= 180:
            return sentence
    return f"{category} event in a public setting: {title}"


def schema_address(address: Any) -> str:
    if isinstance(address, str):
        return clean_text(address)
    if not isinstance(address, dict):
        return ""
    parts = [
        address.get("streetAddress"),
        address.get("addressLocality"),
        address.get("addressRegion"),
        address.get("postalCode"),
        address.get("addressCountry"),
    ]
    return clean_text(", ".join(str(part) for part in parts if part))


def schema_price(raw: dict[str, Any]) -> str:
    offers = raw.get("offers")
    if isinstance(offers, list):
        offers = offers[0] if offers else None
    if not isinstance(offers, dict):
        return "Check official listing"

    price = offers.get("price")
    currency = offers.get("priceCurrency") or ""
    if price in (0, "0", "0.00"):
        return "Free"
    if price:
        return clean_text(f"{price} {currency}".strip())
    availability = offers.get("availability")
    if availability:
        return clean_text(str(availability).split("/")[-1])
    return "Check official listing"


def first_image(image: Any) -> str:
    if isinstance(image, str):
        return image
    if isinstance(image, list) and image:
        return first_image(image[0])
    if isinstance(image, dict):
        return str(image.get("url") or "")
    return ""


def parse_datetime(value: Any) -> str | None:
    if not value:
        return None
    if isinstance(value, list):
        value = value[0] if value else None
    text = str(value).strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return text
    return parsed.isoformat()


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = html.unescape(str(value))
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def dedupe_events(events: list[Event]) -> list[Event]:
    by_key: dict[str, Event] = {}
    for event in events:
        key = stable_id(event.city, event.source_url.casefold())
        existing = by_key.get(key)
        if existing is None or event.social_score > existing.social_score:
            by_key[key] = event
    return sorted(by_key.values(), key=lambda event: (event.start_at, event.title))


def event_search_text(event: Event) -> str:
    return " ".join(
        [
            event.title,
            event.description,
            event.category,
            event.city,
            event.venue_name,
            event.address,
            " ".join(event.language_hints),
            " ".join(event.social_tags),
        ]
    ).casefold()


def stable_id(*parts: str) -> str:
    value = "|".join(part for part in parts if part)
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:16]


def is_free(price_text: str) -> bool:
    text = price_text.casefold()
    return "free" in text or "무료" in text or text in {"0", "0 krw", "0 jpy"}


def cache_is_stale() -> bool:
    return _cache_time is None or datetime.now(timezone.utc) - _cache_time > _cache_ttl
