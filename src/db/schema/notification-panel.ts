import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";
export const notificationReceipts = pgTable(
  "notification_receipts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    sourceId: uuid("source_id").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("notification_receipts_source_unique").on(
      t.userId,
      t.kind,
      t.sourceId,
    ),
  ],
);
export const inAppReminders = pgTable(
  "in_app_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    localDay: text("local_day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("in_app_reminders_day_unique").on(t.userId, t.localDay),
    index("in_app_reminders_user_created_idx").on(t.userId, t.createdAt),
  ],
);
