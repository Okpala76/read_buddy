import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  timestamp,
  unique,
  uuid,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const streakMilestones = pgTable(
  "streak_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    days: integer("days").notNull(),
    localDay: text("local_day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("streak_milestones_user_day_unique").on(t.userId, t.localDay),
    check("streak_milestones_days_check", sql`${t.days} in (10,50,100)`),
  ],
);

export const milestoneCongratulations = pgTable(
  "milestone_congratulations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    milestoneId: uuid("milestone_id")
      .notNull()
      .references(() => streakMilestones.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    reaction: text("reaction"),
    reactionAt: timestamp("reaction_at", { withTimezone: true }),
    reactionReadAt: timestamp("reaction_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "milestone_congratulations_reaction_check",
      sql`${t.reaction} is null or ${t.reaction} in ('❤️','👏','🙌')`,
    ),
    unique("milestone_congratulations_sender_unique").on(
      t.milestoneId,
      t.senderId,
    ),
  ],
);
