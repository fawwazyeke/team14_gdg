import type { FetchEventsInput, RawSourceEvent, SourceAdapter } from "../types";

type ConnpassEvent = Record<string, unknown>;

const CONNPASS_BASE_URL = "https://connpass.com/api/v1/event/";

export const connpassAdapter: SourceAdapter = {
  name: "connpass",
  async fetchEvents(input: FetchEventsInput) {
    if (input.city !== "tokyo" || !process.env.CONNPASS_API_KEY) {
      return [];
    }

    const url = new URL(CONNPASS_BASE_URL);
    url.searchParams.set("keyword", "Tokyo language exchange workshop community meetup");
    url.searchParams.set("ymd", compactDate(input.from));
    url.searchParams.set("count", "50");
    url.searchParams.set("order", "2");

    try {
      const response = await fetch(url, {
        headers: {
          "X-API-Key": process.env.CONNPASS_API_KEY,
          "User-Agent": "BridgeSocialEvents/0.1"
        },
        next: { revalidate: 3600 }
      });

      if (!response.ok) {
        console.warn(`connpass adapter failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const events = Array.isArray(data?.events) ? (data.events as ConnpassEvent[]) : [];
      const to = new Date(input.to).getTime();

      return events
        .filter((event) => new Date(String(event.started_at ?? "")).getTime() <= to)
        .map((event): RawSourceEvent => ({
          source: "connpass",
          payload: event
        }));
    } catch (error) {
      console.warn("connpass adapter error", error);
      return [];
    }
  }
};

function compactDate(value: string): string {
  return value.replaceAll("-", "");
}
