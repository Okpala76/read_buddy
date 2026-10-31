import "server-only";
import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  milestoneCongratulations,
  readingFriends,
  socialPreferences,
  streakMilestones,
  streakNudges,
  users,
} from "@/db/schema";
import type {
  NotificationKind,
  NotificationView,
  Reaction,
} from "../domain/notification";
function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

export async function readSocialPreferences(userId: string) {
  const rows = await database()
    .select()
    .from(socialPreferences)
    .where(eq(socialPreferences.userId, userId));
  return {
    receiveNudges: rows[0]?.receiveNudges ?? true,
    shareMilestones: rows[0]?.shareMilestones ?? true,
  };
}
export async function writeSocialPreferences(
  userId: string,
  settings: { receiveNudges: boolean; shareMilestones: boolean },
) {
  await database().transaction(async (tx) => {
    // Same lock as delivery: after this returns no new opted-out delivery can commit.
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    await tx
      .insert(socialPreferences)
      .values({ userId, ...settings })
      .onConflictDoUpdate({ target: socialPreferences.userId, set: settings });
  });
}

export async function readNotifications(
  userId: string,
): Promise<NotificationView[]> {
  const nudges = await database()
    .select({
      id: streakNudges.id,
      name: users.name,
      createdAt: streakNudges.createdAt,
      readAt: streakNudges.readAt,
      reaction: streakNudges.reaction,
    })
    .from(streakNudges)
    .innerJoin(users, eq(users.id, streakNudges.senderId))
    .where(eq(streakNudges.recipientId, userId))
    .orderBy(desc(streakNudges.createdAt))
    .limit(50);
  const congrats = await database()
    .select({
      id: milestoneCongratulations.id,
      name: users.name,
      days: streakMilestones.days,
      createdAt: milestoneCongratulations.createdAt,
      readAt: milestoneCongratulations.readAt,
      reaction: milestoneCongratulations.reaction,
    })
    .from(milestoneCongratulations)
    .innerJoin(
      streakMilestones,
      eq(streakMilestones.id, milestoneCongratulations.milestoneId),
    )
    .innerJoin(users, eq(users.id, milestoneCongratulations.senderId))
    .where(eq(streakMilestones.userId, userId))
    .orderBy(desc(milestoneCongratulations.createdAt))
    .limit(50);
  const nudgeReactions = await database()
    .select({
      id: streakNudges.id,
      name: users.name,
      createdAt: streakNudges.reactionAt,
      readAt: streakNudges.reactionReadAt,
      reaction: streakNudges.reaction,
    })
    .from(streakNudges)
    .innerJoin(users, eq(users.id, streakNudges.recipientId))
    .where(
      and(eq(streakNudges.senderId, userId), isNotNull(streakNudges.reaction)),
    )
    .orderBy(desc(streakNudges.reactionAt))
    .limit(50);
  const congratsReactions = await database()
    .select({
      id: milestoneCongratulations.id,
      name: users.name,
      days: streakMilestones.days,
      createdAt: milestoneCongratulations.reactionAt,
      readAt: milestoneCongratulations.reactionReadAt,
      reaction: milestoneCongratulations.reaction,
    })
    .from(milestoneCongratulations)
    .innerJoin(
      streakMilestones,
      eq(streakMilestones.id, milestoneCongratulations.milestoneId),
    )
    .innerJoin(users, eq(users.id, streakMilestones.userId))
    .where(
      and(
        eq(milestoneCongratulations.senderId, userId),
        isNotNull(milestoneCongratulations.reaction),
      ),
    )
    .orderBy(desc(milestoneCongratulations.reactionAt))
    .limit(50);
  const convert = (
    rows: {
      id: string;
      name: string | null;
      createdAt: Date | null;
      readAt: Date | null;
      reaction: string | null;
      days?: number;
    }[],
    kind: NotificationKind,
  ): NotificationView[] =>
    rows.map((r) => ({
      id: r.id,
      kind,
      name: r.name,
      days: r.days ?? null,
      createdAt: r.createdAt!.toISOString(),
      read: r.readAt !== null,
      reaction: r.reaction as Reaction | null,
    }));
  return [
    ...convert(nudges, "NUDGE"),
    ...convert(congrats, "CONGRATULATION"),
    ...convert(nudgeReactions, "NUDGE_REACTION"),
    ...convert(congratsReactions, "CONGRATULATION_REACTION"),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}

export async function updateNotification(
  userId: string,
  input: { id: string; kind: NotificationKind; reaction?: Reaction },
) {
  const isNudge = input.kind.startsWith("NUDGE");
  const isReaction = input.kind.endsWith("_REACTION");
  if (isReaction && input.reaction)
    throw new Error("Reactions cannot receive further reactions.");
  const table = isNudge ? streakNudges : milestoneCongratulations;
  return database().transaction(async (tx) => {
    const rows = isNudge
      ? await tx
          .select({
            ownerId: streakNudges.recipientId,
            senderId: streakNudges.senderId,
          })
          .from(streakNudges)
          .where(eq(streakNudges.id, input.id))
      : await tx
          .select({
            ownerId: streakMilestones.userId,
            senderId: milestoneCongratulations.senderId,
          })
          .from(milestoneCongratulations)
          .innerJoin(
            streakMilestones,
            eq(streakMilestones.id, milestoneCongratulations.milestoneId),
          )
          .where(eq(milestoneCongratulations.id, input.id));
    const message = rows[0];
    if (
      !message ||
      (isReaction ? message.senderId : message.ownerId) !== userId
    )
      throw new Error("Notification not found.");
    if (input.reaction) {
      const friendship = await tx
        .select({ id: readingFriends.id })
        .from(readingFriends)
        .where(
          and(
            eq(readingFriends.status, "ACCEPTED"),
            or(
              and(
                eq(readingFriends.userLowId, userId),
                eq(readingFriends.userHighId, message.senderId),
              ),
              and(
                eq(readingFriends.userHighId, userId),
                eq(readingFriends.userLowId, message.senderId),
              ),
            ),
          ),
        )
        .for("share");
      if (!friendship.length)
        throw new Error("You can only react to current friends.");
      // Repeating the same reaction is idempotent and does not reopen the sender's unread item.
      await tx
        .update(table)
        .set({
          readAt: sql`coalesce(${table.readAt}, now())`,
          reaction: input.reaction,
          reactionAt: sql`case when ${table.reaction} is distinct from ${input.reaction} then now() else ${table.reactionAt} end`,
          reactionReadAt: sql`case when ${table.reaction} is distinct from ${input.reaction} then null else ${table.reactionReadAt} end`,
        })
        .where(eq(table.id, input.id));
    } else {
      const column = isReaction ? table.reactionReadAt : table.readAt;
      await tx
        .update(table)
        .set(
          isReaction
            ? { reactionReadAt: sql`coalesce(${column},now())` }
            : { readAt: sql`coalesce(${column},now())` },
        )
        .where(eq(table.id, input.id));
    }
  });
}
