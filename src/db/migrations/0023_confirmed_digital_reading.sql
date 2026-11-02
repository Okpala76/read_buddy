ALTER TABLE "epub_positions" ADD COLUMN "confirmed_location" integer NOT NULL DEFAULT 0, ADD COLUMN "confirmed_percent" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Preserve pre-release saved progress as a baseline, without inventing sessions.
UPDATE "epub_positions" SET "confirmed_location" = coalesce("location_index",0), "confirmed_percent" = coalesce("progress_percent",0);
--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "locations_read" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "reading_sessions" DROP CONSTRAINT "reading_sessions_page_range_check";
--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_page_range_check" CHECK (
 ("source" = 'EPUB' AND "start_page" = 0 AND "end_page" = 0 AND "locations_read" > 0)
 OR ("source" <> 'EPUB' AND "start_page" >= 0 AND "end_page" > "start_page" AND "locations_read" = 0)
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "completed_via_document" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "books" DROP CONSTRAINT "books_completion_consistency_check";
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_completion_consistency_check" CHECK (
 ("status" = 'COMPLETED' AND ("current_page" = "total_pages" OR "completed_via_document") AND "completed_at" IS NOT NULL)
 OR ("status" <> 'COMPLETED' AND "completed_at" IS NULL)
);
