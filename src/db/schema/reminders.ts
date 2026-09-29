import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { reminderDeliveryStatus } from "@/db/schema/enums";
import { users } from "@/db/schema/users";

export const reminderPreferences = pgTable("reminder_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  reminderTime: time("reminder_time").notNull().default("19:00:00"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reminderDeliveries = pgTable(
  "reminder_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: reminderDeliveryStatus("status").notNull().default("PENDING"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reminder_deliveries_user_scheduled_unique").on(
      table.userId,
      table.scheduledFor,
    ),
    index("reminder_deliveries_status_scheduled_idx").on(
      table.status,
      table.scheduledFor,
    ),
    check(
      "reminder_deliveries_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
);
