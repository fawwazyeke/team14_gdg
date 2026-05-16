import { load } from "cheerio";

export type SchemaEvent = {
  name?: string;
  url?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  image?: string | string[];
  location?: {
    name?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    } | string;
  };
  organizer?: {
    name?: string;
    url?: string;
  };
  offers?: {
    price?: string | number;
    priceCurrency?: string;
  };
};

export function schemaEventsFromHtml(html: string): SchemaEvent[] {
  const $ = load(html);
  const events: SchemaEvent[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const text = $(element).text().trim();
    if (!text) {
      return;
    }

    try {
      collectSchemaEvents(JSON.parse(text), events);
    } catch {
      // Some sites include non-strict JSON-LD. Ignore broken blocks instead of failing the source.
    }
  });

  return events;
}

function collectSchemaEvents(value: unknown, events: SchemaEvent[]) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSchemaEvents(item, events);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (value["@type"] === "Event") {
    events.push(value as SchemaEvent);
    return;
  }

  if (value["@type"] === "ItemList" && Array.isArray(value.itemListElement)) {
    for (const item of value.itemListElement) {
      if (isRecord(item) && item.item) {
        collectSchemaEvents(item.item, events);
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
