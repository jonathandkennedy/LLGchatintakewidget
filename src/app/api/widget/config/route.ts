import { NextRequest, NextResponse } from "next/server";
import { getPublishedWidgetConfigBySlug } from "@/lib/widget/config";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, "widget/config");
  if (limited) return limited;

  try {
    const slug = request.nextUrl.searchParams.get("clientSlug");
    if (!slug) {
      return NextResponse.json({ error: "clientSlug is required" }, { status: 400 });
    }

    const config = await getPublishedWidgetConfigBySlug(slug);
    if (!config) {
      return NextResponse.json({ error: "Widget config not found" }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
