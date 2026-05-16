import type { NormalizedEvent } from "./types";

type AiEventShape = {
  sourceEventId: string;
  summary: string;
  socialScore: number;
  socialTags: string[];
  socialReason: string;
};

export async function enrichEventsWithAi(events: NormalizedEvent[]): Promise<NormalizedEvent[]> {
  if (!process.env.AI_PROVIDER_API_KEY || events.length === 0) {
    return events;
  }

  try {
    const response = await fetch(process.env.AI_PROVIDER_ENDPOINT ?? "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.AI_PROVIDER_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.AI_PROVIDER_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Rank events for gentle social-skill practice. Return JSON with an events array. Keep copy warm, brief, and never imply the app replaces friendship."
          },
          {
            role: "user",
            content: JSON.stringify({
              events: events.slice(0, 25).map((event) => ({
                sourceEventId: event.sourceEventId,
                title: event.title,
                description: event.description.slice(0, 600),
                city: event.city,
                category: event.category,
                languageHints: event.languageHints,
                priceText: event.priceText
              }))
            })
          }
        ]
      })
    });

    if (!response.ok) {
      console.warn(`AI enrichment skipped: ${response.status}`);
      return events;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content ?? "{}") as { events?: AiEventShape[] };
    const byId = new Map((parsed.events ?? []).map((event) => [event.sourceEventId, event]));

    return events.map((event) => {
      const ai = byId.get(event.sourceEventId);
      if (!ai) {
        return event;
      }

      return {
        ...event,
        summary: ai.summary || event.summary,
        socialScore: clampScore(ai.socialScore),
        socialTags: cleanTags(ai.socialTags, event.socialTags),
        socialReason: ai.socialReason || event.socialReason
      };
    });
  } catch (error) {
    console.warn("AI enrichment skipped", error);
    return events;
  }
}

function clampScore(score: number) {
  return Math.max(1, Math.min(5, Math.round(Number(score) || 1)));
}

function cleanTags(tags: string[] | undefined, fallback: string[]) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return fallback;
  }
  return tags.map((tag) => String(tag).toLowerCase().trim()).filter(Boolean).slice(0, 6);
}
