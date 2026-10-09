import "server-only";

import { eq } from "drizzle-orm";

import type { DailyTargetRepository } from "@/features/reading/application";
import { db } from "@/db/client";
import { users } from "@/db/schema";

function getDatabase() {
  if (!db) throw new Error("Database is unavailable");
  return db;
}

export class DrizzleDailyTargetRepository implements DailyTargetRepository {
  async findByUserId(userId: string): Promise<number> {
    const [user] = await getDatabase()
      .select({ dailyPageTarget: users.dailyPageTarget })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new Error("User not found");
    return user.dailyPageTarget;
  }

  async updateByUserId(userId: string, target: number): Promise<void> {
    const [updated] = await getDatabase()
      .update(users)
      .set({ dailyPageTarget: target, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (!updated) throw new Error("User not found");
  }
}
