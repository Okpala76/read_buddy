CREATE TABLE "social_preferences" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE cascade,
  "receive_nudges" boolean NOT NULL DEFAULT true,
  "share_milestones" boolean NOT NULL DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "streak_nudges"
  ADD COLUMN "read_at" timestamp with time zone,
  ADD COLUMN "reaction" text,
  ADD COLUMN "reaction_at" timestamp with time zone,
  ADD COLUMN "reaction_read_at" timestamp with time zone,
  ADD CONSTRAINT "streak_nudges_reaction_check" CHECK ("reaction" IS NULL OR "reaction" IN ('❤️','👏','🙌'));
--> statement-breakpoint
ALTER TABLE "milestone_congratulations"
  ADD COLUMN "read_at" timestamp with time zone,
  ADD COLUMN "reaction" text,
  ADD COLUMN "reaction_at" timestamp with time zone,
  ADD COLUMN "reaction_read_at" timestamp with time zone,
  ADD CONSTRAINT "milestone_congratulations_reaction_check" CHECK ("reaction" IS NULL OR "reaction" IN ('❤️','👏','🙌'));
