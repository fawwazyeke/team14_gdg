import { describe, expect, it } from "vitest";
import { dedupeEvents } from "@/lib/events/pipeline";
import type { NormalizedEvent } from "@/lib/events/types";

describe("event pipeline", () => {
  it("keeps distinct source IDs even when source URLs match", () => {
    const events = dedupeEvents([
      eventFixture("one", "https://example.com/city"),
      eventFixture("two", "https://example.com/city")
    ]);

    expect(events).toHaveLength(2);
  });
});

function eventFixture(sourceEventId: string, sourceUrl: string): NormalizedEvent {
  return {
    source: "meetup-public",
    sourceEventId,
    sourceUrl,
    title: sourceEventId,
    description: "A language exchange meetup.",
    summary: "A friendly event.",
    country: "South Korea",
    city: "seoul",
    venueName: "Venue",
    address: "Address",
    lat: null,
    lng: null,
    startAt: "2026-06-01T10:00:00.000Z",
    endAt: null,
    timezone: "Asia/Seoul",
    category: "Language Exchange",
    priceText: "Free",
    imageUrl: null,
    organizerName: "Organizer",
    languageHints: ["English"],
    socialTags: ["language-friendly"],
    socialScore: 4,
    socialReason: "Strong fit for gentle social practice.",
    lastFetchedAt: "2026-05-16T00:00:00.000Z",
    raw: {}
  };
}
