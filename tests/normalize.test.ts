import { describe, expect, it } from "vitest";
import { normalizeRawEvent } from "@/lib/events/normalize";

describe("normalization", () => {
  it("normalizes schema.org events with social fields", () => {
    const event = normalizeRawEvent({
      source: "meetup-public",
      payload: {
        city: "seoul",
        event: {
          name: "Seoul beginner workshop",
          url: "https://example.com/events/1",
          description: "A beginner-friendly workshop for Korean and English conversation practice.",
          startDate: "2026-06-01T14:00:00+09:00",
          endDate: "2026-06-01T16:00:00+09:00",
          image: "https://example.com/image.jpg",
          location: {
            name: "Community room",
            address: {
              streetAddress: "Seoul"
            }
          },
          organizer: {
            name: "Bridge"
          },
          offers: {
            price: "0",
            priceCurrency: "KRW"
          }
        }
      }
    });

    expect(event?.city).toBe("seoul");
    expect(event?.sourceEventId).toBe("example-com-events-1");
    expect(event?.socialScore).toBeGreaterThanOrEqual(3);
    expect(event?.socialReason).toContain("social");
  });

  it("normalizes connpass events with missing venue fields", () => {
    const event = normalizeRawEvent({
      source: "connpass",
      payload: {
        event_id: 123,
        event_url: "https://connpass.com/event/123",
        title: "Tokyo community meetup",
        description: "<p>Language practice meetup</p>",
        started_at: "2026-06-10T19:00:00+09:00"
      }
    });

    expect(event?.venueName).toBe("Tokyo venue");
    expect(event?.address).toBe("Tokyo");
    expect(event?.description).not.toContain("<p>");
  });
});
