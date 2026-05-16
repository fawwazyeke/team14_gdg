export type City = "seoul" | "tokyo";

export type FetchEventsInput = {
  city: City;
  from: string;
  to: string;
};

export type RawSourceEvent = {
  source: EventSourceName;
  payload: unknown;
};

export type EventSourceName = "kto" | "connpass" | "meetup-public" | "nurio" | "seoul-open-data" | "go-tokyo";

export type NormalizedEvent = {
  id?: number;
  source: EventSourceName;
  sourceEventId: string;
  sourceUrl: string;
  title: string;
  description: string;
  summary: string;
  country: "South Korea" | "Japan";
  city: City;
  venueName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  startAt: string;
  endAt: string | null;
  timezone: "Asia/Seoul" | "Asia/Tokyo";
  category: string;
  priceText: string;
  imageUrl: string | null;
  organizerName: string;
  languageHints: string[];
  socialTags: string[];
  socialScore: number;
  socialReason: string;
  lastFetchedAt: string;
  raw: unknown;
};

export type EventQuery = {
  city?: City;
  from?: string;
  to?: string;
  interest?: string;
  language?: string;
  freeOnly?: boolean;
  minSocialScore?: number;
};

export type SourceAdapter = {
  name: EventSourceName;
  fetchEvents: (input: FetchEventsInput) => Promise<RawSourceEvent[]>;
};
