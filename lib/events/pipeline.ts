import { sourceAdapters } from "./adapters";
import { enrichEventsWithAi } from "./ai";
import { defaultWindow } from "./date";
import { normalizeRawEvent } from "./normalize";
import { countEvents, queryEvents, upsertEvents } from "./store";
import type { City, EventQuery, NormalizedEvent } from "./types";

const cities: City[] = ["seoul", "tokyo"];

export async function refreshEvents(input: Partial<{ from: string; to: string; city: City }> = {}) {
  const window = defaultWindow();
  const from = input.from ?? window.from;
  const to = input.to ?? window.to;
  const targetCities = input.city ? [input.city] : cities;
  const fetchedAt = new Date().toISOString();
  const normalized: NormalizedEvent[] = [];
  const sourceCounts: Record<string, number> = {};

  for (const city of targetCities) {
    for (const adapter of sourceAdapters) {
      const rawEvents = await adapter.fetchEvents({ city, from, to });
      sourceCounts[adapter.name] = (sourceCounts[adapter.name] ?? 0) + rawEvents.length;

      for (const rawEvent of rawEvents) {
        const event = normalizeRawEvent(rawEvent, fetchedAt);
        if (event) {
          normalized.push(event);
        }
      }
    }
  }

  const deduped = dedupeEvents(normalized);
  const enriched = await enrichEventsWithAi(deduped);
  upsertEvents(enriched);

  return {
    from,
    to,
    fetchedAt,
    sourceCounts,
    insertedOrUpdated: enriched.length,
    totalStored: countEvents()
  };
}

export async function getEvents(query: EventQuery = {}) {
  if (countEvents() === 0) {
    await refreshEvents();
  }
  return queryEvents(query);
}

export function dedupeEvents(events: NormalizedEvent[]) {
  const seen = new Map<string, NormalizedEvent>();

  for (const event of events) {
    const key = `${event.source}:${event.sourceEventId}` || event.sourceUrl || `${event.city}:${event.title}:${event.startAt}`;
    const existing = seen.get(key);
    if (!existing || event.socialScore > existing.socialScore) {
      seen.set(key, event);
    }
  }

  return Array.from(seen.values());
}
