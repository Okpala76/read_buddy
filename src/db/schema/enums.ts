import { pgEnum } from "drizzle-orm/pg-core";

export const bookStatus = pgEnum("book_status", [
  "QUEUED",
  "READING",
  "COMPLETED",
]);

export const readingMood = pgEnum("reading_mood", [
  "FOCUSED",
  "RELAXED",
  "ENERGIZED",
  "DISTRACTED",
  "TIRED",
]);

export const reminderDeliveryStatus = pgEnum("reminder_delivery_status", [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "SKIPPED",
]);

export const reminderDeliveryChannel = pgEnum("reminder_delivery_channel", [
  "EMAIL",
  "PUSH",
]);

export const reminderNotificationKind = pgEnum("reminder_notification_kind", [
  "DAILY_REMINDER",
  "STREAK_RESCUE",
]);
