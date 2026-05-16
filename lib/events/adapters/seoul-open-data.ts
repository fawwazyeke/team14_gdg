import type { FetchEventsInput, RawSourceEvent, SourceAdapter } from "../types";

type SeoulOpenDataRow = Record<string, string | number | null | undefined>;

const SEOUL_OPEN_DATA_BASE = "http://openapi.seoul.go.kr:8088";

export const seoulOpenDataAdapter: SourceAdapter = {
  name: "seoul-open-data",
  async fetchEvents(input: FetchEventsInput) {
    const key = process.env.SEOUL_OPEN_DATA_KEY;
    if (input.city !== "seoul" || !key) {
      return [];
    }

    const url = `${SEOUL_OPEN_DATA_BASE}/${encodeURIComponent(key)}/json/culturalEventInfo/1/1000/`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "BridgeSocialEvents/0.1 (+https://github.com/OmriL997/team14_gdg)"
        }
      });

      if (!response.ok) {
        console.warn(`Seoul Open Data adapter failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const rows = Array.isArray(data?.culturalEventInfo?.row) ? (data.culturalEventInfo.row as SeoulOpenDataRow[]) : [];

      return rows
        .filter((row) => rowInWindow(row, input.from, input.to))
        .map((row): RawSourceEvent => ({
          source: "seoul-open-data",
          payload: row
        }));
    } catch (error) {
      console.warn("Seoul Open Data adapter error", error);
      return [];
    }
  }
};

function rowInWindow(row: SeoulOpenDataRow, from: string, to: string) {
  const start = parseSeoulDate(row.STRTDATE ?? row.DATE);
  if (!start) {
    return false;
  }

  return start.getTime() >= new Date(from).getTime() && start.getTime() <= new Date(to).getTime();
}

export function parseSeoulDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  const isoLike = text.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoLike) {
    return new Date(`${isoLike}T10:00:00+09:00`);
  }

  const compact = text.match(/\d{8}/)?.[0];
  if (compact) {
    return new Date(`${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T10:00:00+09:00`);
  }

  return null;
}
