import { eq, desc } from "drizzle-orm";

import { db } from "@/db/client";
import { readingSessions, readingBehaviorProfiles, users } from "@/db/schema";
import type {
  ReadingBehaviorProfile,
  ReadingBehaviorProfileRepository,
  ReadingSessionDate,
} from "../domain";

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

function toProfileDomain(
  row: typeof readingBehaviorProfiles.$inferSelect,
): ReadingBehaviorProfile {
  return {
    userId: row.userId,
    sampleDays: row.sampleDays,
    typicalReadingMinute: row.typicalReadingMinute,
    weekdaySampleDays: row.weekdaySampleDays,
    weekdayTypicalMinute: row.weekdayTypicalMinute,
    weekendSampleDays: row.weekendSampleDays,
    weekendTypicalMinute: row.weekendTypicalMinute,
    windowStart: row.windowStart,
    computedAt: row.computedAt,
  };
}

export class DrizzleReadingBehaviorProfileRepository implements ReadingBehaviorProfileRepository {
  async findByUserId(userId: string): Promise<ReadingBehaviorProfile | null> {
    const database = getDb();
    const rows = await database
      .select()
      .from(readingBehaviorProfiles)
      .where(eq(readingBehaviorProfiles.userId, userId))
      .limit(1);
    return rows[0] ? toProfileDomain(rows[0]) : null;
  }

  async upsert(profile: ReadingBehaviorProfile): Promise<void> {
    const database = getDb();
    const data = {
      userId: profile.userId,
      sampleDays: profile.sampleDays,
      typicalReadingMinute: profile.typicalReadingMinute,
      weekdaySampleDays: profile.weekdaySampleDays,
      weekdayTypicalMinute: profile.weekdayTypicalMinute,
      weekendSampleDays: profile.weekendSampleDays,
      weekendTypicalMinute: profile.weekendTypicalMinute,
      windowStart: profile.windowStart,
      computedAt: profile.computedAt,
    };

    await database
      .insert(readingBehaviorProfiles)
      .values(data)
      .onConflictDoUpdate({
        target: readingBehaviorProfiles.userId,
        set: {
          sampleDays: data.sampleDays,
          typicalReadingMinute: data.typicalReadingMinute,
          weekdaySampleDays: data.weekdaySampleDays,
          weekdayTypicalMinute: data.weekdayTypicalMinute,
          weekendSampleDays: data.weekendSampleDays,
          weekendTypicalMinute: data.weekendTypicalMinute,
          windowStart: data.windowStart,
          computedAt: data.computedAt,
        },
      });
  }

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

  async getUserTimezone(userId: string): Promise<string> {
    const database = getDb();
    const rows = await database
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!rows[0]) {
      throw new Error("User not found");
    }

    return rows[0].timezone;
  }
}
