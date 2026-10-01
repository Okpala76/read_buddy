"use server";

import { requireAuth } from "@/lib/auth/server";
import { DrizzleAnalyticsRepository } from "@/features/analytics/infrastructure";
import {
  GetAnalyticsUseCase,
  getAnalyticsInputSchema,
  GetStreakUseCase,
  GetDateRangeAnalyticsUseCase,
} from "@/features/analytics/application";
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

function getAnalyticsUseCases() {
  const repo = new DrizzleAnalyticsRepository();
  return {
    getAnalytics: new GetAnalyticsUseCase(repo),
    getStreak: new GetStreakUseCase(repo),
    getDateRangeAnalytics: new GetDateRangeAnalyticsUseCase(repo),
  };
}

export async function getAnalytics(input: unknown = {}) {
  const user = await requireAuth();
  const { getAnalytics } = getAnalyticsUseCases();
  const parsed = getAnalyticsInputSchema.parse(input);
  const timezone = await getUserTimezone(user.id);
  return getAnalytics.execute(user.id, parsed, timezone);
}

export async function getStreak() {
  const user = await requireAuth();
  const { getStreak } = getAnalyticsUseCases();
  const timezone = await getUserTimezone(user.id);
  return getStreak.execute(user.id, timezone);
}

export async function getDateRangeAnalytics(startDate: Date, endDate: Date) {
  const user = await requireAuth();
  const { getDateRangeAnalytics } = getAnalyticsUseCases();
  const timezone = await getUserTimezone(user.id);
  return getDateRangeAnalytics.execute(user.id, startDate, endDate, timezone);
}
