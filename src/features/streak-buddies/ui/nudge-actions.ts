"use server";

import { and, desc, eq, gte, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { readingFriends, readingSessions, streakNudgeBatches, streakNudges, streakPartnerships, users } from "@/db/schema";
import { getUserDayUtcRange } from "@/features/analytics/domain";
import { requireAuth } from "@/lib/auth/server";
import { localDayKey } from "../domain/nudge";

function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

/** One optional nudge action per sender-local day. Every recipient can receive
 * at most one nudge on their own local day, even from multiple buddies. */
export async function nudgeMyBuddies(): Promise<{ sent: number; skipped: number; alreadySent: boolean }> {
  const user = await requireAuth();
  const now = new Date();
  const senderDay = localDayKey(now, user.timezone);
  const day = getUserDayUtcRange(now, user.timezone);
  const result = await database().transaction(async (tx) => {
    const read = await tx.select({ id: readingSessions.id }).from(readingSessions).where(
      and(eq(readingSessions.userId, user.id), gte(readingSessions.readAt, day.startDate), lte(readingSessions.readAt, day.endDate))
    ).limit(1);
    if (!read.length) throw new Error("Record your first reading session before nudging buddies.");

    const inserted = await tx.insert(streakNudgeBatches).values({
      senderId: user.id, senderDay
    }).onConflictDoNothing().returning({ id: streakNudgeBatches.id });
    if (!inserted.length) return { sent: 0, skipped: 0, alreadySent: true };

    const partnerships = await tx.select({
      low: readingFriends.userLowId, high: readingFriends.userHighId
    }).from(streakPartnerships).innerJoin(
      readingFriends, eq(streakPartnerships.friendshipId, readingFriends.id)
    ).where(and(
      eq(streakPartnerships.status, "ACTIVE"),
      eq(readingFriends.status, "ACCEPTED"),
      or(eq(readingFriends.userLowId, user.id), eq(readingFriends.userHighId, user.id))
    ));
    const ids = [...new Set(partnerships.map((p) => p.low === user.id ? p.high : p.low))];
    if (!ids.length) return { sent: 0, skipped: 0, alreadySent: false };
    const recipients = await tx.select({ id: users.id, timezone: users.timezone })
      .from(users).where(or(...ids.map((id) => eq(users.id, id))));
    let sent = 0;
    for (const recipient of recipients) {
      const recipientRange = getUserDayUtcRange(now, recipient.timezone);
      const alreadyRead = await tx.select({ id: readingSessions.id }).from(readingSessions)
        .where(and(
          eq(readingSessions.userId, recipient.id),
          gte(readingSessions.readAt, recipientRange.startDate),
          lte(readingSessions.readAt, recipientRange.endDate)
        )).limit(1);
      if (alreadyRead.length) continue;
      const created = await tx.insert(streakNudges).values({
        batchId: inserted[0].id, senderId: user.id, recipientId: recipient.id,
        recipientDay: localDayKey(now, recipient.timezone)
      }).onConflictDoNothing().returning({ id: streakNudges.id });
      sent += created.length;
    }
    return { sent, skipped: recipients.length - sent, alreadySent: false };
  });
  revalidatePath("/friends");
  return result;
}

/** Private in-app inbox; delivery only to the authenticated recipient. */
export async function getReceivedStreakNudges() {
  const user = await requireAuth();
  return database().select({
    id: streakNudges.id, senderName: users.name, createdAt: streakNudges.createdAt
  }).from(streakNudges).innerJoin(users, eq(users.id, streakNudges.senderId))
    .where(eq(streakNudges.recipientId, user.id))
    .orderBy(desc(streakNudges.createdAt)).limit(30);
}
