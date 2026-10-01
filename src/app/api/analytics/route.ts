import { requireAuth } from "@/lib/auth/server";
import { getAnalyticsInputSchema } from "@/features/analytics/application";
import { DrizzleAnalyticsRepository } from "@/features/analytics/infrastructure";
import { GetAnalyticsUseCase } from "@/features/analytics/application";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

async function getUserTimezone(userId: string): Promise<string> {
  const database = getDb();
  const result = await database
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result[0]?.timezone ?? "UTC";
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    const preset = searchParams.get("preset") as
      "week" | "month" | "quarter" | "year" | "all" | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const input = {
      preset: preset ?? undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const parsed = getAnalyticsInputSchema.parse(input);

    const repo = new DrizzleAnalyticsRepository();
    const useCase = new GetAnalyticsUseCase(repo);

    const timezone = await getUserTimezone(user.id);
    const result = await useCase.execute(user.id, parsed, timezone);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
