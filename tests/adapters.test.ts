import { afterEach, describe, expect, it, vi } from "vitest";
import { connpassAdapter } from "@/lib/events/adapters/connpass";
import { ktoAdapter } from "@/lib/events/adapters/kto";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.KTO_SERVICE_KEY;
  delete process.env.CONNPASS_API_KEY;
});

describe("source adapters", () => {
  it("returns no KTO events without an API key", async () => {
    await expect(ktoAdapter.fetchEvents({ city: "seoul", from: "2026-06-01", to: "2026-06-30" })).resolves.toEqual([]);
  });

  it("maps connpass API results when a key exists", async () => {
    process.env.CONNPASS_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          events: [
            {
              event_id: 1,
              title: "Tokyo language exchange",
              started_at: "2026-06-05T19:00:00+09:00"
            }
          ]
        })
      }))
    );

    const events = await connpassAdapter.fetchEvents({ city: "tokyo", from: "2026-06-01", to: "2026-06-30" });

    expect(events).toHaveLength(1);
    expect(events[0].source).toBe("connpass");
  });
});
