"use server";

import { and, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { readingFriends, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/server";
import { canRespondToFriendRequest, friendshipPair } from "../domain/friendship";

function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}
const userIdSchema = z.object({ userId: z.string().uuid() });
const requestIdSchema = z.object({ requestId: z.string().uuid() });
const searchSchema = z.string().trim().min(3).max(100);

export type FriendView = {
  requestId: string;
  userId: string;
  name: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  direction: "incoming" | "outgoing" | "friends";
};

/** Reads only the current user's relationships; no other user's social graph. */
export async function getFriendships(): Promise<FriendView[]> {
  const user = await requireAuth();
  const relationships = await database().select().from(readingFriends)
    .where(or(eq(readingFriends.userLowId, user.id), eq(readingFriends.userHighId, user.id)));
  if (!relationships.length) return [];
  const ids = relationships.map((r) => r.userLowId === user.id ? r.userHighId : r.userLowId);
  const profiles = await database().select({ id: users.id, name: users.name })
    .from(users).where(inArray(users.id, ids));
  const names = new Map(profiles.map((p) => [p.id, p.name]));
  return relationships.map((r) => {
    const otherId = r.userLowId === user.id ? r.userHighId : r.userLowId;
    return {
      requestId: r.id,
      userId: otherId,
      name: names.get(otherId)?.trim() || "ReadOn reader",
      status: r.status as FriendView["status"],
      direction: r.status === "ACCEPTED" ? "friends" as const
        : r.invitedByUserId === user.id ? "outgoing" as const : "incoming" as const,
    };
  });
}

/** Discovery shows display names only, never another member's email address. */
export async function findReadingFriends(query: string) {
  const user = await requireAuth();
  const term = searchSchema.parse(query);
  const matches = await database().select({ id: users.id, name: users.name })
    .from(users)
    .where(and(
      ne(users.id, user.id),
      or(eq(users.email, term.toLowerCase()), ilike(users.name, `%${term.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`)),
    ))
    .limit(10);
  const existing = await getFriendships();
  const byId = new Map(existing.map((r) => [r.userId, r]));
  return matches.map((match) => ({
    id: match.id,
    name: match.name?.trim() || "ReadOn reader",
    relationship: byId.get(match.id)?.status ?? "NONE",
    direction: byId.get(match.id)?.direction ?? null,
  }));
}

export async function sendFriendRequest(input: unknown) {
  const user = await requireAuth();
  const { userId } = userIdSchema.parse(input);
  const pair = friendshipPair(user.id, userId);
  const target = await database().select({ id: users.id }).from(users)
    .where(eq(users.id, userId)).limit(1);
  if (!target.length) throw new Error("Reader not found");

  const inserted = await database().insert(readingFriends).values({
    ...pair, invitedByUserId: user.id,
  }).onConflictDoNothing().returning({ id: readingFriends.id });
  if (!inserted.length) throw new Error("You already have a friendship or request with this reader");
  revalidatePath("/friends");
}

export async function respondToFriendRequest(input: unknown) {
  const user = await requireAuth();
  const { requestId, decision } = requestIdSchema.extend({
    decision: z.enum(["ACCEPTED", "DECLINED"]),
  }).parse(input);
  const current = await database().select().from(readingFriends)
    .where(eq(readingFriends.id, requestId)).limit(1);
  if (!current[0] || !canRespondToFriendRequest(
    { ...current[0], status: current[0].status as "PENDING" | "ACCEPTED" | "DECLINED" },
    user.id,
  )) throw new Error("No pending invitation addressed to you");

  const updated = await database().update(readingFriends)
    .set({ status: decision, updatedAt: new Date() })
    .where(and(
      eq(readingFriends.id, requestId),
      eq(readingFriends.status, "PENDING"),
      ne(readingFriends.invitedByUserId, user.id),
      or(eq(readingFriends.userLowId, user.id), eq(readingFriends.userHighId, user.id)),
    ))
    .returning({ id: readingFriends.id });
  if (!updated.length) throw new Error("Invitation has already been handled");
  revalidatePath("/friends");
}

/** Pending inviters may cancel; accepted friends may unfriend. */
export async function removeFriendship(input: unknown) {
  const user = await requireAuth();
  const { requestId } = requestIdSchema.parse(input);
  const relationship = await database().select().from(readingFriends)
    .where(and(
      eq(readingFriends.id, requestId),
      or(eq(readingFriends.userLowId, user.id), eq(readingFriends.userHighId, user.id)),
    )).limit(1);
  const row = relationship[0];
  if (!row || (row.status !== "ACCEPTED" && !(row.status === "PENDING" && row.invitedByUserId === user.id))) {
    throw new Error("This relationship cannot be removed");
  }
  await database().delete(readingFriends).where(and(
    eq(readingFriends.id, requestId),
    or(eq(readingFriends.userLowId, user.id), eq(readingFriends.userHighId, user.id)),
  ));
  revalidatePath("/friends");
}
