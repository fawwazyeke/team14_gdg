import { schemaEventsFromHtml } from "../schema";
import type { FetchEventsInput, RawSourceEvent, SourceAdapter } from "../types";

const meetupCityUrls = {
  seoul: "https://www.meetup.com/find/kr--seoul/",
  tokyo: "https://www.meetup.com/find/jp--tokyo/"
} as const;

export const meetupPublicAdapter: SourceAdapter = {
  name: "meetup-public",
  async fetchEvents(input: FetchEventsInput) {
    const url = meetupCityUrls[input.city];

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "BridgeSocialEvents/0.1 (+https://github.com/OmriL997/team14_gdg)"
        }
      });

      if (!response.ok) {
        console.warn(`Meetup public adapter failed: ${response.status}`);
        return [];
      }

      const events = schemaEventsFromHtml(await response.text());
      return events
        .filter((event) => isInWindow(event.startDate, input.from, input.to))
        .map((event): RawSourceEvent => ({
          source: "meetup-public",
          payload: {
            city: input.city,
            event
          }
        }));
    } catch (error) {
      console.warn("Meetup public adapter error", error);
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
