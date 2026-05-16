import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { EventQuery, NormalizedEvent } from "./types";

const defaultDbPath = path.join(process.cwd(), "data", "social-events.sqlite");

let db: Database.Database | null = null;

export function getDb() {
  if (db) {
    return db;
  }

  const dbPath = process.env.EVENTS_DB_PATH ?? defaultDbPath;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  initDb(db);
  return db;
}

export function initDb(database = getDb()) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_event_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      summary TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      venue_name TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL,
      lng REAL,
      start_at TEXT NOT NULL,
      end_at TEXT,
      timezone TEXT NOT NULL,
      category TEXT NOT NULL,
      price_text TEXT NOT NULL,
      image_url TEXT,
      organizer_name TEXT NOT NULL,
      language_hints TEXT NOT NULL,
      social_tags TEXT NOT NULL,
      social_score INTEGER NOT NULL,
      social_reason TEXT NOT NULL,
      last_fetched_at TEXT NOT NULL,
      raw TEXT NOT NULL,
      UNIQUE(source, source_event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_city_start ON events(city, start_at);
    CREATE INDEX IF NOT EXISTS idx_events_social_score ON events(social_score);
  `);
}

export function upsertEvents(events: NormalizedEvent[], database = getDb()) {
  const statement = database.prepare(`
    INSERT INTO events (
      source, source_event_id, source_url, title, description, summary, country, city,
      venue_name, address, lat, lng, start_at, end_at, timezone, category, price_text,
      image_url, organizer_name, language_hints, social_tags, social_score, social_reason,
      last_fetched_at, raw
    ) VALUES (
      @source, @sourceEventId, @sourceUrl, @title, @description, @summary, @country, @city,
      @venueName, @address, @lat, @lng, @startAt, @endAt, @timezone, @category, @priceText,
      @imageUrl, @organizerName, @languageHints, @socialTags, @socialScore, @socialReason,
      @lastFetchedAt, @raw
    )
    ON CONFLICT(source, source_event_id) DO UPDATE SET
      source_url = excluded.source_url,
      title = excluded.title,
      description = excluded.description,
      summary = excluded.summary,
      country = excluded.country,
      city = excluded.city,
      venue_name = excluded.venue_name,
      address = excluded.address,
      lat = excluded.lat,
      lng = excluded.lng,
      start_at = excluded.start_at,
      end_at = excluded.end_at,
      timezone = excluded.timezone,
      category = excluded.category,
      price_text = excluded.price_text,
      image_url = excluded.image_url,
      organizer_name = excluded.organizer_name,
      language_hints = excluded.language_hints,
      social_tags = excluded.social_tags,
      social_score = excluded.social_score,
      social_reason = excluded.social_reason,
      last_fetched_at = excluded.last_fetched_at,
      raw = excluded.raw
  `);

  const write = database.transaction((items: NormalizedEvent[]) => {
    for (const event of items) {
      statement.run(toRowParams(event));
    }
  });

  write(events);
}

export function queryEvents(query: EventQuery = {}, database = getDb()): NormalizedEvent[] {
  const clauses = ["date(start_at) >= date(@from)", "date(start_at) <= date(@to)"];
  const params: Record<string, string | number> = {
    from: query.from ?? new Date().toISOString().slice(0, 10),
    to: query.to ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  };

  if (query.city) {
    clauses.push("city = @city");
    params.city = query.city;
  }

  if (query.interest) {
    clauses.push("(lower(title) LIKE @interest OR lower(description) LIKE @interest OR lower(category) LIKE @interest OR lower(social_tags) LIKE @interest)");
    params.interest = `%${query.interest.toLowerCase()}%`;
  }

  if (query.language) {
    clauses.push("lower(language_hints) LIKE @language");
    params.language = `%${query.language.toLowerCase()}%`;
  }

  if (query.freeOnly) {
    clauses.push("(lower(price_text) LIKE '%free%' OR price_text LIKE '%0%')");
  }

  if (query.minSocialScore) {
    clauses.push("social_score >= @minSocialScore");
    params.minSocialScore = query.minSocialScore;
  }

  const rows = database
    .prepare(
      `
      SELECT * FROM events
      WHERE ${clauses.join(" AND ")}
      ORDER BY social_score DESC, start_at ASC
      LIMIT 100
    `
    )
    .all(params) as Record<string, unknown>[];

  return rows.map(fromRow);
}

export function countEvents(database = getDb()) {
  const row = database.prepare("SELECT COUNT(*) as count FROM events").get() as { count?: number } | undefined;
  return Number(row?.count ?? 0);
}

export function closeDbForTests() {
  db?.close();
  db = null;
}

function toRowParams(event: NormalizedEvent) {
  return {
    ...event,
    sourceEventId: event.sourceEventId,
    sourceUrl: event.sourceUrl,
    venueName: event.venueName,
    startAt: event.startAt,
    endAt: event.endAt,
    priceText: event.priceText,
    imageUrl: event.imageUrl,
    organizerName: event.organizerName,
    languageHints: JSON.stringify(event.languageHints),
    socialTags: JSON.stringify(event.socialTags),
    socialScore: event.socialScore,
    socialReason: event.socialReason,
    lastFetchedAt: event.lastFetchedAt,
    raw: JSON.stringify(event.raw)
  };
}

function fromRow(row: Record<string, unknown>): NormalizedEvent {
  return {
    id: Number(row.id),
    source: row.source as NormalizedEvent["source"],
    sourceEventId: String(row.source_event_id),
    sourceUrl: String(row.source_url),
    title: String(row.title),
    description: String(row.description),
    summary: String(row.summary),
    country: row.country as NormalizedEvent["country"],
    city: row.city as NormalizedEvent["city"],
    venueName: String(row.venue_name),
    address: String(row.address),
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    startAt: String(row.start_at),
    endAt: row.end_at ? String(row.end_at) : null,
    timezone: row.timezone as NormalizedEvent["timezone"],
    category: String(row.category),
    priceText: String(row.price_text),
    imageUrl: row.image_url ? String(row.image_url) : null,
    organizerName: String(row.organizer_name),
    languageHints: JSON.parse(String(row.language_hints)),
    socialTags: JSON.parse(String(row.social_tags)),
    socialScore: Number(row.social_score),
    socialReason: String(row.social_reason),
    lastFetchedAt: String(row.last_fetched_at),
    raw: JSON.parse(String(row.raw))
  };
}
