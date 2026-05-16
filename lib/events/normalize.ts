import { enrichSocialFit, stripHtml } from "./scoring";
import type { SchemaEvent } from "./schema";
import type { NormalizedEvent, RawSourceEvent } from "./types";

type KtoPayload = Record<string, string | number | undefined>;
type ConnpassPayload = Record<string, unknown>;
type SeoulOpenDataPayload = Record<string, string | number | null | undefined>;
type GoTokyoPayload = {
  title: string;
  sourceUrl: string;
  startAt: string;
  endAt: string | null;
};
type SchemaPayload = {
  city: "seoul" | "tokyo";
  event: SchemaEvent;
};

export function normalizeRawEvent(raw: RawSourceEvent, fetchedAt = new Date().toISOString()): NormalizedEvent | null {
  if (raw.source === "kto") {
    return withSocialFields(normalizeKto(raw.payload as KtoPayload, fetchedAt));
  }

  if (raw.source === "connpass") {
    return withSocialFields(normalizeConnpass(raw.payload as ConnpassPayload, fetchedAt));
  }

  if (raw.source === "meetup-public") {
    return withSocialFields(normalizeSchemaEvent(raw.payload as SchemaPayload, "meetup-public", fetchedAt));
  }

  if (raw.source === "nurio") {
    return withSocialFields(normalizeSchemaEvent(raw.payload as SchemaPayload, "nurio", fetchedAt));
  }

  if (raw.source === "seoul-open-data") {
    return withSocialFields(normalizeSeoulOpenData(raw.payload as SeoulOpenDataPayload, fetchedAt));
  }

  if (raw.source === "go-tokyo") {
    return withSocialFields(normalizeGoTokyo(raw.payload as GoTokyoPayload, fetchedAt));
  }

  return null;
}

function normalizeKto(event: KtoPayload, fetchedAt: string) {
  const startAt = parseKtoDate(String(event.eventstartdate ?? ""));
  const endAt = parseKtoDate(String(event.eventenddate ?? ""));

  return {
    source: "kto" as const,
    sourceEventId: String(event.contentid ?? event.title ?? crypto.randomUUID()),
    sourceUrl: `https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=${event.contentid ?? ""}`,
    title: String(event.title ?? "Untitled Korea event"),
    description: stripHtml(String(event.overview ?? event.addr1 ?? "")),
    country: "South Korea" as const,
    city: "seoul" as const,
    venueName: String(event.addr1 ?? "Seoul venue"),
    address: [event.addr1, event.addr2].filter(Boolean).join(" "),
    lat: numberOrNull(event.mapy),
    lng: numberOrNull(event.mapx),
    startAt,
    endAt,
    timezone: "Asia/Seoul" as const,
    category: "Tourism Event",
    priceText: "Check official listing",
    imageUrl: typeof event.firstimage === "string" && event.firstimage ? event.firstimage : null,
    organizerName: "Korea Tourism Organization",
    languageHints: ["English"],
    lastFetchedAt: fetchedAt,
    raw: event
  };
}

function normalizeConnpass(event: ConnpassPayload, fetchedAt: string) {
  return {
    source: "connpass" as const,
    sourceEventId: String(event.event_id ?? event.event_url ?? crypto.randomUUID()),
    sourceUrl: String(event.event_url ?? "https://connpass.com/"),
    title: String(event.title ?? "Untitled Tokyo event"),
    description: stripHtml(String(event.description ?? event.catch ?? "")),
    country: "Japan" as const,
    city: "tokyo" as const,
    venueName: String(event.place ?? "Tokyo venue"),
    address: String(event.address ?? "Tokyo"),
    lat: numberOrNull(event.lat),
    lng: numberOrNull(event.lon),
    startAt: new Date(String(event.started_at ?? new Date().toISOString())).toISOString(),
    endAt: event.ended_at ? new Date(String(event.ended_at)).toISOString() : null,
    timezone: "Asia/Tokyo" as const,
    category: "Community Event",
    priceText: priceText(event),
    imageUrl: null,
    organizerName: String(event.owner_nickname ?? "connpass organizer"),
    languageHints: ["Japanese", "English keyword search"],
    lastFetchedAt: fetchedAt,
    raw: event
  };
}

function normalizeSchemaEvent(payload: SchemaPayload, source: "meetup-public" | "nurio", fetchedAt: string) {
  const event = payload.event;
  const city = payload.city;
  const address = schemaAddress(event.location?.address);
  const sourceUrl = String(event.url ?? `${source}:${event.name ?? crypto.randomUUID()}`);
  const startAt = new Date(String(event.startDate ?? new Date().toISOString())).toISOString();
  const endAt = event.endDate ? new Date(String(event.endDate)).toISOString() : null;

  return {
    source,
    sourceEventId: stableIdFromUrl(sourceUrl),
    sourceUrl,
    title: String(event.name ?? "Untitled event"),
    description: stripHtml(String(event.description ?? "")),
    country: city === "tokyo" ? ("Japan" as const) : ("South Korea" as const),
    city,
    venueName: String(event.location?.name ?? (city === "tokyo" ? "Tokyo venue" : "Seoul venue")),
    address: address || (city === "tokyo" ? "Tokyo" : "Seoul"),
    lat: null,
    lng: null,
    startAt,
    endAt,
    timezone: city === "tokyo" ? ("Asia/Tokyo" as const) : ("Asia/Seoul" as const),
    category: source === "meetup-public" ? "Meetup" : "Community Event",
    priceText: schemaPrice(event),
    imageUrl: firstImage(event.image, sourceUrl),
    organizerName: String(event.organizer?.name ?? (source === "meetup-public" ? "Meetup organizer" : "nurio")),
    languageHints: inferLanguageHints(`${event.name ?? ""} ${event.description ?? ""}`),
    lastFetchedAt: fetchedAt,
    raw: event
  };
}

function normalizeSeoulOpenData(event: SeoulOpenDataPayload, fetchedAt: string) {
  const startAt = parseFlexibleKoreaDate(event.STRTDATE ?? event.DATE);
  const endAt = parseFlexibleKoreaDate(event.END_DATE);

  return {
    source: "seoul-open-data" as const,
    sourceEventId: stableIdFromUrl(String(event.ORG_LINK ?? event.TITLE ?? crypto.randomUUID())),
    sourceUrl: String(event.ORG_LINK ?? event.HMPG_ADDR ?? "https://data.seoul.go.kr/"),
    title: String(event.TITLE ?? "Untitled Seoul event"),
    description: stripHtml(String(event.PROGRAM ?? event.ETC_DESC ?? event.PLAYER ?? "")),
    country: "South Korea" as const,
    city: "seoul" as const,
    venueName: String(event.PLACE ?? "Seoul venue"),
    address: String(event.PLACE ?? "Seoul"),
    lat: numberOrNull(event.LAT),
    lng: numberOrNull(event.LOT),
    startAt,
    endAt,
    timezone: "Asia/Seoul" as const,
    category: String(event.CODENAME ?? "Cultural Event"),
    priceText: String(event.USE_FEE ?? event.IS_FREE ?? "Check official listing"),
    imageUrl: typeof event.MAIN_IMG === "string" && event.MAIN_IMG ? event.MAIN_IMG : null,
    organizerName: String(event.ORG_NAME ?? "Seoul Metropolitan Government"),
    languageHints: inferLanguageHints(`${event.TITLE ?? ""} ${event.PROGRAM ?? ""}`),
    lastFetchedAt: fetchedAt,
    raw: event
  };
}

function normalizeGoTokyo(event: GoTokyoPayload, fetchedAt: string) {
  return {
    source: "go-tokyo" as const,
    sourceEventId: stableIdFromUrl(event.sourceUrl),
    sourceUrl: event.sourceUrl,
    title: event.title,
    description: `${event.title} listed on GO TOKYO, the official Tokyo travel guide event calendar.`,
    country: "Japan" as const,
    city: "tokyo" as const,
    venueName: "Tokyo",
    address: "Tokyo",
    lat: null,
    lng: null,
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: "Asia/Tokyo" as const,
    category: "Official Tokyo Event",
    priceText: "Check official listing",
    imageUrl: null,
    organizerName: "GO TOKYO",
    languageHints: ["English", "Japanese"],
    lastFetchedAt: fetchedAt,
    raw: event
  };
}

function withSocialFields(event: Omit<NormalizedEvent, "id" | "summary" | "socialScore" | "socialTags" | "socialReason">): NormalizedEvent {
  const enrichment = enrichSocialFit(event);
  return {
    ...event,
    ...enrichment
  };
}

function parseKtoDate(value: string): string {
  if (/^\d{8}$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    return new Date(`${year}-${month}-${day}T10:00:00+09:00`).toISOString();
  }
  return new Date().toISOString();
}

function parseFlexibleKoreaDate(value: unknown): string {
  if (!value) {
    return new Date().toISOString();
  }

  const text = String(value);
  const isoLike = text.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoLike) {
    return new Date(`${isoLike}T10:00:00+09:00`).toISOString();
  }

  const compact = text.match(/\d{8}/)?.[0];
  if (compact) {
    return new Date(`${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T10:00:00+09:00`).toISOString();
  }

  return new Date().toISOString();
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function priceText(event: ConnpassPayload): string {
  const fee = event.event_fee;
  if (fee === 0 || fee === "0") {
    return "Free";
  }
  if (fee) {
    return `JPY ${fee}`;
  }
  return "Check official listing";
}

function schemaAddress(address: SchemaEvent["location"] extends infer Location ? Location extends { address?: infer Address } ? Address | undefined : never : never): string {
  if (!address) {
    return "";
  }

  if (typeof address === "string") {
    return address;
  }

  return [address.streetAddress, address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(", ");
}

function schemaPrice(event: SchemaEvent): string {
  const price = event.offers?.price;
  if (price === undefined || price === null || price === "") {
    return "Check official listing";
  }
  if (price === 0 || price === "0") {
    return "Free";
  }
  return `${event.offers?.priceCurrency ?? ""} ${price}`.trim();
}

function firstImage(image: SchemaEvent["image"], baseUrl: string): string | null {
  const value = Array.isArray(image) ? image[0] : image;
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function inferLanguageHints(text: string): string[] {
  const lower = text.toLowerCase();
  const hints = new Set<string>();

  if (lower.includes("english")) {
    hints.add("English");
  }
  if (lower.includes("japanese") || text.includes("日本語")) {
    hints.add("Japanese");
  }
  if (lower.includes("korean") || text.includes("한국어")) {
    hints.add("Korean");
  }
  if (lower.includes("language exchange")) {
    hints.add("Language exchange");
  }

  return hints.size > 0 ? Array.from(hints) : ["Check listing"];
}

function stableIdFromUrl(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
}
