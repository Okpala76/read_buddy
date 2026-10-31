CREATE TABLE "streak_nudge_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "sender_day" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "streak_nudge_batch_sender_day_unique" UNIQUE("sender_id","sender_day")
);
--> statement-breakpoint
CREATE TABLE "streak_nudges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL REFERENCES "streak_nudge_batches"("id") ON DELETE cascade,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "recipient_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "recipient_day" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "streak_nudges_recipient_day_unique" UNIQUE("recipient_id","recipient_day")
);
--> statement-breakpoint
CREATE INDEX "streak_nudges_recipient_created_idx" ON "streak_nudges" ("recipient_id","created_at");
