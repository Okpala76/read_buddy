ALTER TABLE "reminder_deliveries" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD COLUMN "skip_reason" text;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD CONSTRAINT "reminder_deliveries_skip_reason_check" CHECK ((
        "reminder_deliveries"."status" = 'SKIPPED'
        and "reminder_deliveries"."skip_reason" is not null
      ) or (
        "reminder_deliveries"."status" <> 'SKIPPED'
        and "reminder_deliveries"."skip_reason" is null
      ));