CREATE TABLE "streak_milestones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "days" integer NOT NULL,
  "local_day" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "streak_milestones_user_day_unique" UNIQUE("user_id","local_day"),
  CONSTRAINT "streak_milestones_days_check" CHECK ("days" in (10,50,100))
);
--> statement-breakpoint
CREATE TABLE "milestone_congratulations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "milestone_id" uuid NOT NULL REFERENCES "streak_milestones"("id") ON DELETE cascade,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "milestone_congratulations_sender_unique" UNIQUE("milestone_id","sender_id")
);
