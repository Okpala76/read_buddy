"use server";

import { and, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { readingFriends, streakPartnerships, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/server";
import { canReplyToStreakInvite, mayChangeStreakPartnership } from "../domain/partnership";

function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

const friendshipInput = z.object({ friendshipId: z.string().uuid() });
const partnershipInput = z.object({ partnershipId: z.string().uuid() });
type Status = "PENDING" | "ACTIVE" | "PAUSED" | "DECLINED" | "ENDED";

export interface StreakPartnershipView {
  id: string;
  friendshipId: string;
  partnerId: string;
  partnerName: string;
  status: Status;
  direction: "incoming" | "outgoing" | "accepted";
  canResume: boolean;
  pausedByYou: boolean;
}

/** Only relationship participants can view these records. */
export async function getStreakPartnerships(): Promise<StreakPartnershipView[]> {
  const user = await requireAuth();
  const friends = await database().select().from(readingFriends)
    .where(and(
      eq(readingFriends.status, "ACCEPTED"),
      or(eq(readingFriends.userLowId, user.id), eq(readingFriends.userHighId, user.id)),
    ));
  if (!friends.length) return [];
  const rows = await database().select().from(streakPartnerships)
    .where(inArray(streakPartnerships.friendshipId, friends.map((f) => f.id)));
  if (!rows.length) return [];
  const friendsById = new Map(friends.map((f) => [f.id, f]));
  const partnerIds = friends.map((f) => f.userLowId === user.id ? f.userHighId : f.userLowId);
  const people = await database().select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, partnerIds));
  const names = new Map(people.map((p) => [p.id, p.name?.trim() || "ReadOn reader"]));
  return rows.map((r) => {
    const friendship = friendsById.get(r.friendshipId)!;
    const partnerId = friendship.userLowId === user.id ? friendship.userHighId : friendship.userLowId;
    return {
      id: r.id,
      friendshipId: r.friendshipId,
      partnerId,
      partnerName: names.get(partnerId) || "ReadOn reader",
      status: r.status as Status,
      direction: r.status !== "PENDING" ? "accepted" as const :
        r.invitedByUserId === user.id ? "outgoing" as const : "incoming" as const,
      canResume: r.status === "PAUSED" && r.pausedByUserId === user.id,
      pausedByYou: r.status === "PAUSED" && r.pausedByUserId === user.id,
    };
  });
}

export async function inviteStreakBuddy(input: unknown) {
  const user = await requireAuth();
  const { friendshipId } = friendshipInput.parse(input);
  await database().transaction(async (tx) => {
    const friends = await tx.select().from(readingFriends)
      .where(and(eq(readingFriends.id, friendshipId),
        or(eq(readingFriends.userLowId, user.id), eq(readingFriends.userHighId, user.id)),
      )).limit(1).for("update");
    if (!friends[0] || friends[0].status !== "ACCEPTED") throw new Error("Become reading friends before starting a streak journey");
    const prior = await tx.select().from(streakPartnerships)
      .where(eq(streakPartnerships.friendshipId, friendshipId)).limit(1).for("update");
    if (prior.length) {
      if (prior[0].status !== "ENDED") throw new Error("A streak invitation or partnership already exists with this friend");
      await tx.update(streakPartnerships).set({
        status: "PENDING", invitedByUserId: user.id, pausedByUserId: null,
        updatedAt: new Date(),
      }).where(and(eq(streakPartnerships.id, prior[0].id), eq(streakPartnerships.status, "ENDED")));
    } else {
      await tx.insert(streakPartnerships).values({
        friendshipId, invitedByUserId: user.id, status: "PENDING",
      });
    }
  });
  revalidatePath("/friends");
}

export async function respondToStreakInvitation(input: unknown) {
  const user = await requireAuth();
  const { partnershipId, decision } = partnershipInput.extend({
    decision: z.enum(["ACTIVE", "DECLINED"]),
  }).parse(input);
  await database().transaction(async (tx) => {
    const rows = await tx.select({
      id: streakPartnerships.id, status: streakPartnerships.status,
      invitedByUserId: streakPartnerships.invitedByUserId,
      low: readingFriends.userLowId, high: readingFriends.userHighId,
      friendshipStatus: readingFriends.status,
    }).from(streakPartnerships)
      .innerJoin(readingFriends, eq(readingFriends.id, streakPartnerships.friendshipId))
      .where(and(eq(streakPartnerships.id, partnershipId),
        or(eq(readingFriends.userLowId, user.id), eq(readingFriends.userHighId, user.id)),
      )).limit(1).for("update");
    const item = rows[0];
    if (!item || item.friendshipStatus !== "ACCEPTED" ||
      !canReplyToStreakInvite({ status: item.status as Status, invitedByUserId: item.invitedByUserId }, user.id)) {
      throw new Error("No pending streak invitation addressed to you");
    }
    const changed = await tx.update(streakPartnerships).set({
      status: decision, pausedByUserId: null, updatedAt: new Date(),
    }).where(and(
      eq(streakPartnerships.id, partnershipId),
      eq(streakPartnerships.status, "PENDING"),
    )).returning({ id: streakPartnerships.id });
    if (!changed.length) throw new Error("Streak invitation has already been handled");
  });
  revalidatePath("/friends");
}

export async function manageStreakPartnership(input: unknown) {
  const user = await requireAuth();
  const { partnershipId, action } = partnershipInput.extend({
    action: z.enum(["PAUSE", "RESUME", "END", "CANCEL"]),
  }).parse(input);
  await database().transaction(async (tx) => {
    const rows = await tx.select({
      id: streakPartnerships.id, status: streakPartnerships.status,
      pausedByUserId: streakPartnerships.pausedByUserId,
      invitedByUserId: streakPartnerships.invitedByUserId,
      friendshipStatus: readingFriends.status,
    }).from(streakPartnerships)
      .innerJoin(readingFriends, eq(readingFriends.id, streakPartnerships.friendshipId))
      .where(and(eq(streakPartnerships.id, partnershipId),
        or(eq(readingFriends.userLowId, user.id), eq(readingFriends.userHighId, user.id)),
      )).limit(1).for("update");
    const row = rows[0];
    if (!row || row.friendshipStatus !== "ACCEPTED") throw new Error("Streak partnership not found");
    if (action === "CANCEL") {
      if (row.status !== "PENDING" || row.invitedByUserId !== user.id) throw new Error("Only the inviter can cancel their pending request");
    } else if (!mayChangeStreakPartnership(
      { status: row.status as Status, pausedByUserId: row.pausedByUserId },
      user.id,
      action,
    )) throw new Error("This action is not available for the partnership");
    const next = action === "PAUSE" ? "PAUSED" :
      action === "RESUME" ? "ACTIVE" : "ENDED";
    await tx.update(streakPartnerships).set({
      status: next,
      pausedByUserId: action === "PAUSE" ? user.id : null,
      updatedAt: new Date(),
    }).where(eq(streakPartnerships.id, partnershipId));
  });
  revalidatePath("/friends");
}
