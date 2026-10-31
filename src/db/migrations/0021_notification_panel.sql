CREATE TABLE "notification_receipts" (
 "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
 "kind" text NOT NULL,
 "source_id" uuid NOT NULL,
 "read_at" timestamp with time zone NOT NULL DEFAULT now(),
 CONSTRAINT "notification_receipts_source_unique" UNIQUE("user_id","kind","source_id")
);
--> statement-breakpoint
CREATE TABLE "in_app_reminders" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
 "local_day" text NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 CONSTRAINT "in_app_reminders_day_unique" UNIQUE("user_id","local_day")
);
--> statement-breakpoint
CREATE INDEX "in_app_reminders_user_created_idx" ON "in_app_reminders" ("user_id","created_at");
--> statement-breakpoint
-- In-app encouragement is always enabled. Retain the historical table for
-- compatibility; no public action exposes these switches after this release.
UPDATE "social_preferences" SET "receive_nudges" = true, "share_milestones" = true;
