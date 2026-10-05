ALTER TABLE "reminder_deliveries" ADD COLUMN "recipient_email" text;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD COLUMN "book_title" text;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD COLUMN "book_current_page" integer;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD COLUMN "book_total_pages" integer;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD COLUMN "daily_page_target" integer;--> statement-breakpoint
UPDATE "reminder_deliveries" AS "delivery"
SET
	"recipient_email" = "user"."email",
	"daily_page_target" = "user"."daily_page_target"
FROM "users" AS "user"
WHERE "delivery"."user_id" = "user"."id";--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ALTER COLUMN "recipient_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ALTER COLUMN "daily_page_target" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "reminder_deliveries_status_next_attempt_idx" ON "reminder_deliveries" USING btree ("status","next_attempt_at");
