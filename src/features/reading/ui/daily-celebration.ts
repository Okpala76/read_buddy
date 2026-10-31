import "server-only";
import { recordReadingMilestone } from "@/features/streak-buddies/infrastructure/milestone-repository";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { readingSessions } from "@/db/schema";
import { getUserDayUtcRange } from "@/features/analytics/domain";
import { GetStreakUseCase } from "@/features/analytics/application";
import { DrizzleAnalyticsRepository } from "@/features/analytics/infrastructure";

export type DailyCelebration = {
  bookTitle: string;
  pagesRead: number;
  streakDays: number;
  source: "PHYSICAL" | "PDF";
};

/** The canonical first saved session in the user's local calendar day gets the
 * one daily celebration. No celebration is generated from page navigation. */
export async function celebrationForSavedSession({
  userId,
  timezone,
  sessionId,
  readAt,
  bookTitle,
  pagesRead,
  source,
}: {
  userId: string;
  timezone: string;
  sessionId: string;
  readAt: Date;
  bookTitle: string;
  pagesRead: number;
  source: "PHYSICAL" | "PDF";
}): Promise<DailyCelebration | null> {
  if (!db || pagesRead <= 0) return null;
  await recordReadingMilestone(userId, timezone, readAt);
  const day = getUserDayUtcRange(readAt, timezone);
  const first = await db
    .select({ id: readingSessions.id })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.userId, userId),
        gte(readingSessions.readAt, day.startDate),
        lte(readingSessions.readAt, day.endDate),
      ),
    )
    .orderBy(asc(readingSessions.readAt), asc(readingSessions.id))
    .limit(1);
  if (first[0]?.id !== sessionId) return null;
  const streak = await new GetStreakUseCase(
    new DrizzleAnalyticsRepository(),
  ).execute(userId, timezone);
  return { bookTitle, pagesRead, streakDays: streak.currentStreak, source };
}
