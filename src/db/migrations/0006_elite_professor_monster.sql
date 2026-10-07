CREATE TYPE "public"."reminder_delivery_channel" AS ENUM('EMAIL', 'PUSH');--> statement-breakpoint
ALTER TABLE "reminder_preferences" ALTER COLUMN "enabled" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD COLUMN "delivery_channel" "reminder_delivery_channel";--> statement-breakpoint
ALTER TABLE "reminder_preferences" ADD COLUMN "email_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "reminder_deliveries"
SET "delivery_channel" = 'EMAIL'
WHERE "status" <> 'SKIPPED';--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD CONSTRAINT "reminder_deliveries_channel_check" CHECK ((
        "reminder_deliveries"."status" in ('SENT', 'FAILED')
        and "reminder_deliveries"."delivery_channel" is not null
      ) or (
        "reminder_deliveries"."status" = 'SKIPPED'
        and "reminder_deliveries"."delivery_channel" is null
      ) or "reminder_deliveries"."status" in ('PENDING', 'PROCESSING'));
