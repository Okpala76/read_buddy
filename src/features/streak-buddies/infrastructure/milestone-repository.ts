import "server-only";
import { and, desc, eq, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  milestoneCongratulations,
  readingFriends,
  readingSessions,
  streakMilestones,
  users,
} from "@/db/schema";
import { reachedMilestone } from "../domain/milestone";

function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

export async function recordReadingMilestone(
  userId: string,
  timezone: string,
  readAt: Date,
) {
  const sessions = await database()
    .select({ readAt: readingSessions.readAt })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.userId, userId),
        lte(readingSessions.readAt, readAt),
      ),
    );
  const milestone = reachedMilestone(
    sessions.map((s) => s.readAt),
    timezone,
    readAt,
  );
  if (milestone)
    await database()
      .insert(streakMilestones)
      .values({ userId, ...milestone })
      .onConflictDoNothing();
}

function friendshipCondition(userId: string) {
  return and(
    eq(readingFriends.status, "ACCEPTED"),
    or(
      and(
        eq(readingFriends.userLowId, userId),
        eq(readingFriends.userHighId, streakMilestones.userId),
      ),
      and(
        eq(readingFriends.userHighId, userId),
        eq(readingFriends.userLowId, streakMilestones.userId),
      ),
    ),
  );
}

export async function readFriendMilestones(userId: string) {
  return database()
    .select({
      id: streakMilestones.id,
      days: streakMilestones.days,
      name: users.name,
      sent: sql<boolean>`exists(select 1 from ${milestoneCongratulations} where ${milestoneCongratulations.milestoneId} = ${streakMilestones.id} and ${milestoneCongratulations.senderId} = ${userId})`,
    })
    .from(streakMilestones)
    .innerJoin(users, eq(users.id, streakMilestones.userId))
    .innerJoin(readingFriends, friendshipCondition(userId))
    .orderBy(desc(streakMilestones.createdAt))
    .limit(30);
}

export async function congratulateFriendMilestone(
  userId: string,
  milestoneId: string,
) {
  // Lock the friendship while checking and inserting, so removal cannot race delivery.
  return database().transaction(async (tx) => {
    const eligible = await tx
      .select({ id: streakMilestones.id })
      .from(streakMilestones)
      .innerJoin(readingFriends, friendshipCondition(userId))
      .where(eq(streakMilestones.id, milestoneId))
      .for("update", { of: readingFriends });
    if (!eligible.length)
      throw new Error("This milestone is not available to you.");
    await tx
      .insert(milestoneCongratulations)
      .values({ milestoneId, senderId: userId })
      .onConflictDoNothing();
  });
}

export async function readReceivedCongratulations(userId: string) {
  return database()
    .select({
      id: milestoneCongratulations.id,
      days: streakMilestones.days,
      name: users.name,
    })
    .from(milestoneCongratulations)
    .innerJoin(
      streakMilestones,
      eq(streakMilestones.id, milestoneCongratulations.milestoneId),
    )
    .innerJoin(users, eq(users.id, milestoneCongratulations.senderId))
    .where(eq(streakMilestones.userId, userId))
    .orderBy(desc(milestoneCongratulations.createdAt))
    .limit(30);
}
