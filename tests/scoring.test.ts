import { describe, expect, it } from "vitest";
import { enrichSocialFit } from "@/lib/events/scoring";

describe("social scoring", () => {
  it("scores language exchanges above passive listings", () => {
    const active = enrichSocialFit({
      source: "meetup-public",
      sourceEventId: "1",
      sourceUrl: "https://example.com",
      title: "Beginner language exchange and board game meetup",
      description: "Small groups practice conversation with prompts.",
      country: "Japan",
      city: "tokyo",
      venueName: "Cafe",
      address: "Tokyo",
      lat: null,
      lng: null,
      startAt: new Date().toISOString(),
      endAt: null,
      timezone: "Asia/Tokyo",
      category: "Language Exchange",
      priceText: "Free",
      imageUrl: null,
      organizerName: "Test",
      languageHints: ["English"],
      lastFetchedAt: new Date().toISOString(),
      raw: {}
    });

    const passive = enrichSocialFit({
      source: "meetup-public",
      sourceEventId: "2",
      sourceUrl: "https://example.com/2",
      title: "Large concert screening",
      description: "A passive performance event.",
      country: "Japan",
      city: "tokyo",
      venueName: "Hall",
      address: "Tokyo",
      lat: null,
      lng: null,
      startAt: new Date().toISOString(),
      endAt: null,
      timezone: "Asia/Tokyo",
      category: "Concert",
      priceText: "JPY 3000",
      imageUrl: null,
      organizerName: "Test",
      languageHints: ["Japanese"],
      lastFetchedAt: new Date().toISOString(),
      raw: {}
    });

    expect(active.socialScore).toBeGreaterThan(passive.socialScore);
    expect(active.socialTags).toContain("language-friendly");
  });
});
