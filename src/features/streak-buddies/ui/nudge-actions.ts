"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { streakNudges, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/server";
import { sendDailyNudges } from "../infrastructure/nudge-repository";

function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

export async function nudgeMyBuddies() {
  const user = await requireAuth();
  const result = await sendDailyNudges(user);
  revalidatePath("/friends");
  revalidatePath("/notifications");
  return result;
}

/** Private in-app inbox; delivery only to the authenticated recipient. */
export async function getReceivedStreakNudges() {
  const user = await requireAuth();
  return database()
    .select({
      id: streakNudges.id,
      senderName: users.name,
      createdAt: streakNudges.createdAt,
    })
    .from(streakNudges)
    .innerJoin(users, eq(users.id, streakNudges.senderId))
    .where(eq(streakNudges.recipientId, user.id))
    .orderBy(desc(streakNudges.createdAt))
    .limit(30);
}
