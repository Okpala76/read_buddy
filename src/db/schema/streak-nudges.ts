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

export const streakNudgeBatches = pgTable(
  "streak_nudge_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    senderDay: text("sender_day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("streak_nudge_batch_sender_day_unique").on(t.senderId, t.senderDay),
  ],
);

export const streakNudges = pgTable(
  "streak_nudges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => streakNudgeBatches.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientDay: text("recipient_day").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    reaction: text("reaction"),
    reactionAt: timestamp("reaction_at", { withTimezone: true }),
    reactionReadAt: timestamp("reaction_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("streak_nudges_recipient_day_unique").on(
      t.recipientId,
      t.recipientDay,
    ),
    check(
      "streak_nudges_reaction_check",
      sql`${t.reaction} is null or ${t.reaction} in ('❤️','👏','🙌')`,
    ),
    index("streak_nudges_recipient_created_idx").on(t.recipientId, t.createdAt),
  ],
);
