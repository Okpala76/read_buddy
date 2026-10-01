import { db } from "@/db/client";
import { readingSessions } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { ReadingSession } from "@/features/reading/domain";
import { type AnalyticsRepository } from "@/features/analytics/application";

function toDomain(row: typeof readingSessions.$inferSelect): ReadingSession {
  return ReadingSession.reconstitute({
    id: row.id,
    userId: row.userId,
    bookId: row.bookId,
    startPage: row.startPage,
    endPage: row.endPage,
    pagesRead: row.pagesRead,
    mood: row.mood,
    readAt: row.readAt,
    createdAt: row.createdAt,
  });
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export class DrizzleAnalyticsRepository implements AnalyticsRepository {
  async findSessionsByUserId(userId: string): Promise<ReadingSession[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.userId, userId))
      .orderBy(desc(readingSessions.readAt));
    return rows.map(toDomain);
  }

  async findSessionsByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ReadingSession[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.userId, userId),
          gte(readingSessions.readAt, startDate),
          lte(readingSessions.readAt, endDate),
        ),
      )
      .orderBy(desc(readingSessions.readAt));
    return rows.map(toDomain);
  }
}
