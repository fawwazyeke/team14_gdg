import { toKtoDate } from "../date";
import type { FetchEventsInput, RawSourceEvent, SourceAdapter } from "../types";

type KtoItem = Record<string, string | number | undefined>;

const KTO_BASE_URL = "https://apis.data.go.kr/B551011/EngService2/searchFestival2";

export const ktoAdapter: SourceAdapter = {
  name: "kto",
  async fetchEvents(input: FetchEventsInput) {
    if (input.city !== "seoul" || !process.env.KTO_SERVICE_KEY) {
      return [];
    }

    const url = new URL(KTO_BASE_URL);
    url.searchParams.set("serviceKey", process.env.KTO_SERVICE_KEY);
    url.searchParams.set("MobileOS", "ETC");
    url.searchParams.set("MobileApp", "BridgeSocialEvents");
    url.searchParams.set("_type", "json");
    url.searchParams.set("numOfRows", "40");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("arrange", "A");
    url.searchParams.set("areaCode", "1");
    url.searchParams.set("eventStartDate", toKtoDate(input.from));

    try {
      const response = await fetch(url, { next: { revalidate: 3600 } });
      if (!response.ok) {
        console.warn(`KTO adapter failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const items = normalizeItems(data?.response?.body?.items?.item);
      const to = toKtoDate(input.to);

      return items
        .filter((item) => String(item.eventstartdate ?? "") <= to)
        .map((item): RawSourceEvent => ({
          source: "kto",
          payload: item
        }));
    } catch (error) {
      console.warn("KTO adapter error", error);
      return [];
    }
  }
};

function normalizeItems(items: unknown): KtoItem[] {
  if (!items) {
    return [];
  }
  return Array.isArray(items) ? (items as KtoItem[]) : [items as KtoItem];
}
