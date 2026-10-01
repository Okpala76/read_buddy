import { requireAuth } from "@/lib/auth/server";
import { DrizzleAnalyticsRepository } from "@/features/analytics/infrastructure";
import { GetStreakUseCase } from "@/features/analytics/application";
import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const user = await requireAuth();

    const repo = new DrizzleAnalyticsRepository();
    const useCase = new GetStreakUseCase(repo);

    const timezone = await getUserTimezone(user.id);
    const result = await useCase.execute(user.id, timezone);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Streak API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch streak" },
      { status: 500 },
    );
  }
}
