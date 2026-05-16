from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from dotenv import load_dotenv

if TYPE_CHECKING:
    from app.services.event_service import Event

from app.firebase import get_firestore

load_dotenv()


@dataclass(frozen=True)
class FirebaseSaveResult:
    enabled: bool
    saved: int = 0
    error: str | None = None


async def save_events_to_firestore(
    events: list[Event],
    refresh_metadata: dict[str, Any],
) -> FirebaseSaveResult:
    return await asyncio.to_thread(save_events_to_firestore_sync, events, refresh_metadata)


def save_events_to_firestore_sync(
    events: list[Event],
    refresh_metadata: dict[str, Any],
) -> FirebaseSaveResult:
    if not firebase_is_configured():
        return FirebaseSaveResult(enabled=False)

    try:
        db = get_firestore()
        collection_name = os.getenv("FIREBASE_EVENTS_COLLECTION", "events")
        saved = batch_upsert_events(db, collection_name, events)
        write_refresh_metadata(db, collection_name, refresh_metadata, saved)
        return FirebaseSaveResult(enabled=True, saved=saved)
    except Exception as exc:
        return FirebaseSaveResult(enabled=True, error=f"{type(exc).__name__}: {exc}")


def firebase_is_configured() -> bool:
    return any(
        os.getenv(name)
        for name in (
            "FIREBASE_SERVICE_ACCOUNT_JSON",
            "FIREBASE_SERVICE_ACCOUNT_FILE",
            "FIREBASE_SERVICE_ACCOUNT_KEY",
            "GOOGLE_APPLICATION_CREDENTIALS",
        )
    ) or os.path.exists("serviceAccountKey.json")


def batch_upsert_events(db: Any, collection_name: str, events: list[Event]) -> int:
    saved = 0
    for chunk in chunks(events, 450):
        batch = db.batch()
        for event in chunk:
            doc_ref = db.collection(collection_name).document(event.id)
            batch.set(doc_ref, event_document(event), merge=True)
            saved += 1
        batch.commit()
    return saved


def write_refresh_metadata(
    db: Any,
    collection_name: str,
    refresh_metadata: dict[str, Any],
    saved: int,
) -> None:
    metadata = {
        **refresh_metadata,
        "firebase_saved": saved,
        "collection": collection_name,
    }
    db.collection("event_refresh_runs").document(refresh_metadata["fetched_at"]).set(metadata)


def event_document(event: Event) -> dict[str, Any]:
    if hasattr(event, "model_dump"):
        data = event.model_dump(mode="json")
    else:
        data = event.dict()

    return {
        **data,
        "updated_at": event.last_fetched_at,
    }


def chunks(events: list[Event], size: int) -> list[list[Event]]:
    return [events[index : index + size] for index in range(0, len(events), size)]
