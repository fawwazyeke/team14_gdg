import type { NormalizedEvent } from "./types";

const socialSignals = [
  "language exchange",
  "meetup",
  "workshop",
  "walk",
  "community",
  "beginner",
  "conversation",
  "friends",
  "social",
  "culture",
  "club",
  "board game",
  "volunteer",
  "practice"
];

const passiveSignals = ["exhibition", "concert", "performance", "screening", "festival"];

export type SocialEnrichment = {
  summary: string;
  socialScore: number;
  socialTags: string[];
  socialReason: string;
};

export function enrichSocialFit(event: Omit<NormalizedEvent, "summary" | "socialScore" | "socialTags" | "socialReason">): SocialEnrichment {
  const text = `${event.title} ${event.description} ${event.category}`.toLowerCase();
  const tags = new Set<string>();
  let score = 2;

  for (const signal of socialSignals) {
    if (text.includes(signal)) {
      score += 1;
    }
  }

  if (text.includes("language") || text.includes("exchange") || text.includes("한국어") || text.includes("日本語")) {
    tags.add("language-friendly");
    tags.add("language-exchange");
  }

  if (text.includes("beginner") || text.includes("first time") || text.includes("intro")) {
    tags.add("beginner-friendly");
  }

  if (text.includes("walk") || text.includes("tour") || text.includes("outdoor")) {
    tags.add("outdoor");
  }

  if (text.includes("workshop") || text.includes("class") || text.includes("practice")) {
    tags.add("workshop");
  }

  if (text.includes("culture") || text.includes("traditional") || text.includes("festival")) {
    tags.add("culture");
  }

  if (event.priceText.toLowerCase().includes("free") || event.priceText.includes("0")) {
    tags.add("low-cost");
    score += 1;
  }

  for (const signal of passiveSignals) {
    if (text.includes(signal)) {
      score -= 1;
    }
  }

  if (tags.size === 0) {
    tags.add("public-event");
  }

  const socialScore = Math.max(1, Math.min(5, score));
  const summary = summarize(event.title, event.description, event.city);
  const socialReason = reasonFromScore(socialScore, Array.from(tags), event.city);

  return {
    summary,
    socialScore,
    socialTags: Array.from(tags).slice(0, 5),
    socialReason
  };
}

function summarize(title: string, description: string, city: string): string {
  const cleaned = stripHtml(description).replace(/\s+/g, " ").trim();
  if (cleaned.length > 30) {
    return `${cleaned.slice(0, 150).replace(/\s+\S*$/, "")}.`;
  }
  return `${title} is an upcoming ${city} event that can give people a concrete reason to show up and start a small conversation.`;
}

function reasonFromScore(score: number, tags: string[], city: string): string {
  if (score >= 4) {
    return `Strong fit for gentle social practice in ${city}: ${tags.slice(0, 3).join(", ")}.`;
  }
  if (score === 3) {
    return `Useful as a low-pressure outing, especially if the user wants a shared topic to talk about.`;
  }
  return `Listed as a public option, but it may need a friendlier prompt or group invite to feel social.`;
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
