CREATE TYPE "public"."reminder_notification_kind" AS ENUM('DAILY_REMINDER', 'STREAK_RESCUE');--> statement-breakpoint
DROP INDEX "reminder_deliveries_user_scheduled_unique";--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD COLUMN "notification_kind" "reminder_notification_kind" DEFAULT 'DAILY_REMINDER' NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder_preferences" ADD COLUMN "streak_rescue_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder_preferences" ADD COLUMN "streak_rescue_time" time DEFAULT '21:30:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder_preferences" ADD COLUMN "quiet_hours_start" time DEFAULT '22:30:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder_preferences" ADD COLUMN "quiet_hours_end" time DEFAULT '07:00:00' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_deliveries_user_scheduled_kind_unique" ON "reminder_deliveries" USING btree ("user_id","scheduled_for","notification_kind");