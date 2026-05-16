import { load } from "cheerio";
import type { FetchEventsInput, RawSourceEvent, SourceAdapter } from "../types";

const GO_TOKYO_CALENDAR_URL = "https://www.gotokyo.org/en/calendar/index.html";

type GoTokyoEvent = {
  title: string;
  sourceUrl: string;
  startAt: string;
  endAt: string | null;
};

export const goTokyoAdapter: SourceAdapter = {
  name: "go-tokyo",
  async fetchEvents(input: FetchEventsInput) {
    if (input.city !== "tokyo") {
      return [];
    }

    try {
      const response = await fetch(GO_TOKYO_CALENDAR_URL, {
        headers: {
          "User-Agent": "BridgeSocialEvents/0.1 (+https://github.com/OmriL997/team14_gdg)"
        }
      });

      if (!response.ok) {
        console.warn(`GO TOKYO adapter failed: ${response.status}`);
        return [];
      }

      const events = parseGoTokyoEvents(await response.text());
      return events
        .filter((event) => isInWindow(event.startAt, input.from, input.to))
        .map((event): RawSourceEvent => ({
          source: "go-tokyo",
          payload: event
        }));
    } catch (error) {
      console.warn("GO TOKYO adapter error", error);
      return [];
    }
  }
};

export function parseGoTokyoEvents(html: string): GoTokyoEvent[] {
  const $ = load(html);
  const events: GoTokyoEvent[] = [];
  const seen = new Set<string>();

  $("a").each((_, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim();
    const dateMatch = text.match(/([A-Z][a-z]{2})\.?\s+(\d{1,2}),\s+(20\d{2})(?:\s+-\s+([A-Z][a-z]{2})\.?\s+(\d{1,2}),\s+(20\d{2}))?\s+(.+)/);
    const href = $(element).attr("href");
    if (!dateMatch || !href) {
      return;
    }

    const sourceUrl = new URL(href, GO_TOKYO_CALENDAR_URL).toString();
    if (seen.has(sourceUrl)) {
      return;
    }
    seen.add(sourceUrl);

    const startAt = parseEnglishDate(dateMatch[1], dateMatch[2], dateMatch[3]);
    const endAt = dateMatch[4] ? parseEnglishDate(dateMatch[4], dateMatch[5], dateMatch[6]) : null;

    events.push({
      title: dateMatch[7].trim(),
      sourceUrl,
      startAt,
      endAt
    });
  });

  return events;
}

function parseEnglishDate(month: string, day: string, year: string) {
  return new Date(`${month} ${day}, ${year} 10:00:00 GMT+0900`).toISOString();
}

function isInWindow(startAt: string, from: string, to: string) {
  const start = new Date(startAt).getTime();
  return start >= new Date(from).getTime() && start <= new Date(to).getTime();
}
