import type { NormalizedEvent } from "./types";

export type DisplayCategory =
  | "Language Exchange"
  | "Games & Hobbies"
  | "Outdoor & Sports"
  | "Culture & Festivals"
  | "Workshops & Learning"
  | "Social Mixers"
  | "Community Events";

const categoryOrder: DisplayCategory[] = [
  "Language Exchange",
  "Games & Hobbies",
  "Outdoor & Sports",
  "Culture & Festivals",
  "Workshops & Learning",
  "Social Mixers",
  "Community Events"
];

export function getDisplayCategory(event: NormalizedEvent): DisplayCategory {
  const text = `${event.title} ${event.description} ${event.category} ${event.socialTags.join(" ")}`.toLowerCase();

  if (includesAny(text, ["language", "exchange", "english", "japanese", "korean", "日本語", "한국어"])) {
    return "Language Exchange";
  }

  if (includesAny(text, ["board game", "game", "gaming", "hobby", "craft", "karaoke", "anime", "manga"])) {
    return "Games & Hobbies";
  }

  if (includesAny(text, ["hike", "hiking", "walk", "run", "running", "sports", "football", "futsal", "outdoor", "mountain", "river"])) {
    return "Outdoor & Sports";
  }

  if (includesAny(text, ["culture", "festival", "traditional", "museum", "exhibition", "geisha", "theatre", "art", "market"])) {
    return "Culture & Festivals";
  }

  if (includesAny(text, ["workshop", "class", "study", "seminar", "lecture", "learn", "practice", "tech", "coding"])) {
    return "Workshops & Learning";
  }

  if (includesAny(text, ["social", "party", "friends", "mixer", "hangout", "night out", "meet new"])) {
    return "Social Mixers";
  }

  return "Community Events";
}

export function getOrderedCategories(events: NormalizedEvent[]) {
  const present = new Set(events.map(getDisplayCategory));
  return categoryOrder.filter((category) => present.has(category));
}

function includesAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}
