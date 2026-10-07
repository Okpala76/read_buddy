import { eq, desc } from "drizzle-orm";

import { db } from "@/db/client";
import { readingSessions } from "@/db/schema";
import type { ReminderStreakRepository, ReadingSessionDate } from "../domain";

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export class DrizzleReminderStreakRepository implements ReminderStreakRepository {
  async findRecentReadingDates(
    userId: string,
    limit: number,
  ): Promise<Array<ReadingSessionDate>> {
    const database = getDb();
    const rows = await database
      .select({ readAt: readingSessions.readAt })
      .from(readingSessions)
      .where(eq(readingSessions.userId, userId))
      .orderBy(desc(readingSessions.readAt))
      .limit(limit);

    return rows.map((row) => ({ readAt: row.readAt }));
  }
}
