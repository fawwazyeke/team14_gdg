import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { initDb, queryEvents, upsertEvents } from "@/lib/events/store";
import type { NormalizedEvent } from "@/lib/events/types";

let database: Database.Database | null = null;

afterEach(() => {
  database?.close();
  database = null;
});

describe("event store", () => {
  it("filters by city, dates, free-only, and social score", () => {
    database = new Database(":memory:");
    initDb(database);

    upsertEvents(
      [
        eventFixture({
          sourceEventId: "seoul-free",
          city: "seoul",
          priceText: "Free",
          socialScore: 5,
          startAt: "2026-06-01T10:00:00.000Z"
        }),
        eventFixture({
          sourceEventId: "tokyo-paid",
          city: "tokyo",
          priceText: "JPY 1000",
          socialScore: 2,
          startAt: "2026-06-01T10:00:00.000Z"
        })
      ],
      database
    );

    const results = queryEvents(
      {
        city: "seoul",
        from: "2026-06-01",
        to: "2026-06-30",
        freeOnly: true,
        minSocialScore: 4
      },
      database
    );

    expect(results).toHaveLength(1);
    expect(results[0].sourceEventId).toBe("seoul-free");
  });
});

function eventFixture(overrides: Partial<NormalizedEvent>): NormalizedEvent {
  return {
    source: "meetup-public",
    sourceEventId: "fixture",
    sourceUrl: "https://example.com",
    title: "Fixture event",
    description: "A language exchange meetup.",
    summary: "A friendly event.",
    country: overrides.city === "tokyo" ? "Japan" : "South Korea",
    city: "seoul",
    venueName: "Venue",
    address: "Address",
    lat: null,
    lng: null,
    startAt: "2026-06-01T10:00:00.000Z",
    endAt: null,
    timezone: overrides.city === "tokyo" ? "Asia/Tokyo" : "Asia/Seoul",
    category: "Language Exchange",
    priceText: "Free",
    imageUrl: null,
    organizerName: "Organizer",
    languageHints: ["English"],
    socialTags: ["language-friendly"],
    socialScore: 4,
    socialReason: "Strong fit for gentle social practice.",
    lastFetchedAt: "2026-05-16T00:00:00.000Z",
    raw: {},
    ...overrides
  };
}
