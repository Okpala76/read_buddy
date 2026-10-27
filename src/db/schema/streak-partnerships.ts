import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { readingFriends } from "./reading-friends";
import { users } from "./users";

/** One independently accepted one-to-one streak journey per accepted friendship. */
export const streakPartnerships = pgTable("streak_partnerships", {
  id: uuid("id").primaryKey().defaultRandom(),
  friendshipId: uuid("friendship_id").notNull().references(() => readingFriends.id, { onDelete: "cascade" }),
  invitedByUserId: uuid("invited_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("PENDING"),
  pausedByUserId: uuid("paused_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("streak_partnerships_friendship_unique").on(table.friendshipId),
  index("streak_partnerships_inviter_status_idx").on(table.invitedByUserId, table.status),
  check("streak_partnerships_status_check", sql`${table.status} in ('PENDING','ACTIVE','PAUSED','DECLINED','ENDED')`),
  check("streak_partnerships_pause_check", sql`(${table.status} = 'PAUSED' and ${table.pausedByUserId} is not null) or (${table.status} <> 'PAUSED' and ${table.pausedByUserId} is null)`),
]);
