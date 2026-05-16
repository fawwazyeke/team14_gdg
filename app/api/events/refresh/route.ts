import { refreshEvents } from "@/lib/events/pipeline";
import type { City } from "@/lib/events/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const configuredToken = process.env.EVENT_REFRESH_TOKEN;

  if (configuredToken) {
    const token = request.headers.get("x-refresh-token");
    if (token !== configuredToken) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }
  }

  const body = await safeJson(request);
  const result = await refreshEvents({
    city: parseCity(body.city),
    from: typeof body.from === "string" ? body.from : undefined,
    to: typeof body.to === "string" ? body.to : undefined
  });

  return NextResponse.json(result);
}

async function safeJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function parseCity(value: unknown): City | undefined {
  if (value === "seoul" || value === "tokyo") {
    return value;
  }
  return undefined;
}
