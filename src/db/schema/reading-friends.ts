import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/** One unordered friendship pair. The inviter is the only user who cannot
 * accept/decline their own request. Streak partnerships are a separate opt-in. */
export const readingFriends = pgTable(
  "reading_friends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userLowId: uuid("user_low_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userHighId: uuid("user_high_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("reading_friends_pair_unique").on(table.userLowId, table.userHighId),
    index("reading_friends_low_status_idx").on(table.userLowId, table.status),
    index("reading_friends_high_status_idx").on(table.userHighId, table.status),
    check(
      "reading_friends_order_check",
      sql`${table.userLowId} < ${table.userHighId}`,
    ),
    check(
      "reading_friends_inviter_check",
      sql`${table.invitedByUserId} in (${table.userLowId}, ${table.userHighId})`,
    ),
    check(
      "reading_friends_status_check",
      sql`${table.status} in ('PENDING','ACCEPTED','DECLINED')`,
    ),
  ],
);
