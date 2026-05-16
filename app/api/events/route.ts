import { getEvents } from "@/lib/events/pipeline";
import type { City, EventQuery } from "@/lib/events/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query: EventQuery = {
    city: parseCity(params.get("city")),
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    interest: params.get("interest") ?? undefined,
    language: params.get("language") ?? undefined,
    freeOnly: params.get("freeOnly") === "true",
    minSocialScore: Number(params.get("minSocialScore") ?? 1)
  };

  const events = await getEvents(query);
  return NextResponse.json({ events });
}

function parseCity(value: string | null): City | undefined {
  if (value === "seoul" || value === "tokyo") {
    return value;
  }
  return undefined;
}
