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

import {
  reminderDeliveryChannel,
  reminderDeliveryStatus,
  reminderNotificationKind,
} from "@/db/schema/enums";
import { users } from "@/db/schema/users";

export const reminderPreferences = pgTable("reminder_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  reminderTime: time("reminder_time").notNull().default("19:00:00"),
  streakRescueEnabled: boolean("streak_rescue_enabled").notNull().default(true),
  streakRescueTime: time("streak_rescue_time").notNull().default("21:30:00"),
  quietHoursStart: time("quiet_hours_start").notNull().default("22:30:00"),
  quietHoursEnd: time("quiet_hours_end").notNull().default("07:00:00"),
  adaptiveTimingEnabled: boolean("adaptive_timing_enabled")
    .notNull()
    .default(false),
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
    recipientEmail: text("recipient_email").notNull(),
    bookTitle: text("book_title"),
    bookCurrentPage: integer("book_current_page"),
    bookTotalPages: integer("book_total_pages"),
    dailyPageTarget: integer("daily_page_target").notNull(),
    status: reminderDeliveryStatus("status").notNull().default("PENDING"),
    deliveryChannel: reminderDeliveryChannel("delivery_channel"),
    notificationKind: reminderNotificationKind("notification_kind")
      .notNull()
      .default("DAILY_REMINDER"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    skipReason: text("skip_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reminder_deliveries_user_scheduled_kind_unique").on(
      table.userId,
      table.scheduledFor,
      table.notificationKind,
    ),
    index("reminder_deliveries_status_scheduled_idx").on(
      table.status,
      table.scheduledFor,
    ),
    index("reminder_deliveries_status_next_attempt_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
    check(
      "reminder_deliveries_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "reminder_deliveries_skip_reason_check",
      sql`(
        ${table.status} = 'SKIPPED'
        and ${table.skipReason} is not null
      ) or (
        ${table.status} <> 'SKIPPED'
        and ${table.skipReason} is null
      )`,
    ),
    check(
      "reminder_deliveries_channel_check",
      sql`(
        ${table.status} in ('SENT', 'FAILED')
        and ${table.deliveryChannel} is not null
      ) or (
        ${table.status} = 'SKIPPED'
        and ${table.deliveryChannel} is null
      ) or ${table.status} in ('PENDING', 'PROCESSING')`,
    ),
  ],
);
