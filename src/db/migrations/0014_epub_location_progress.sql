ALTER TABLE "epub_positions" ADD COLUMN "location_index" integer;
--> statement-breakpoint
ALTER TABLE "epub_positions" ADD COLUMN "location_total" integer;
--> statement-breakpoint
ALTER TABLE "epub_positions" ADD COLUMN "progress_percent" integer;
--> statement-breakpoint
ALTER TABLE "epub_positions" ADD CONSTRAINT "epub_positions_location_range_check" CHECK ("location_index" IS NULL OR ("location_index" > 0 AND "location_total" >= "location_index"));
--> statement-breakpoint
ALTER TABLE "epub_positions" ADD CONSTRAINT "epub_positions_percent_range_check" CHECK ("progress_percent" IS NULL OR ("progress_percent" >= 0 AND "progress_percent" <= 100));
