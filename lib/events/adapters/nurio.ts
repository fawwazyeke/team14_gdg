import { schemaEventsFromHtml } from "../schema";
import type { FetchEventsInput, RawSourceEvent, SourceAdapter } from "../types";

const NURIO_EVENTS_URL = "https://nurio.kr/events?lang=en";

export const nurioAdapter: SourceAdapter = {
  name: "nurio",
  async fetchEvents(input: FetchEventsInput) {
    if (input.city !== "seoul") {
      return [];
    }

    try {
      const response = await fetch(NURIO_EVENTS_URL, {
        headers: {
          "User-Agent": "BridgeSocialEvents/0.1 (+https://github.com/OmriL997/team14_gdg)"
        }
      });

      if (!response.ok) {
        console.warn(`nurio adapter failed: ${response.status}`);
        return [];
      }

      const events = schemaEventsFromHtml(await response.text());
      return events
        .filter((event) => isInWindow(event.startDate, input.from, input.to))
        .filter((event) => JSON.stringify(event.location ?? {}).toLowerCase().includes("seoul"))
        .map((event): RawSourceEvent => ({
          source: "nurio",
          payload: {
            city: input.city,
            event
          }
        }));
    } catch (error) {
      console.warn("nurio adapter error", error);
      return [];
    }
  }
};

function isInWindow(startDate: string | undefined, from: string, to: string) {
  if (!startDate) {
    return false;
  }

  const start = new Date(startDate).getTime();
  return start >= new Date(from).getTime() && start <= new Date(to).getTime();
}
