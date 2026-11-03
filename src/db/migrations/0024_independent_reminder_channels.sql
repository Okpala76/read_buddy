-- Keep historical occurrences in their original delivery mode; never replay them.
ALTER TABLE "reminder_deliveries" ADD COLUMN "delivery_target" text DEFAULT 'LEGACY' NOT NULL;
--> statement-breakpoint
DROP INDEX "reminder_deliveries_user_scheduled_kind_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_deliveries_user_scheduled_kind_target_unique" ON "reminder_deliveries" ("user_id", "scheduled_for", "notification_kind", "delivery_target");
--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD CONSTRAINT "reminder_deliveries_target_check" CHECK ("delivery_target" IN ('LEGACY', 'EMAIL', 'PUSH'));
