CREATE TABLE "streak_partnerships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "friendship_id" uuid NOT NULL,
  "invited_by_user_id" uuid NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "paused_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "streak_partnerships_friendship_unique" UNIQUE("friendship_id"),
  CONSTRAINT "streak_partnerships_status_check" CHECK ("status" in ('PENDING','ACTIVE','PAUSED','DECLINED','ENDED')),
  CONSTRAINT "streak_partnerships_pause_check" CHECK (("status" = 'PAUSED' and "paused_by_user_id" is not null) or ("status" <> 'PAUSED' and "paused_by_user_id" is null))
);
--> statement-breakpoint
ALTER TABLE "streak_partnerships" ADD CONSTRAINT "streak_partnerships_friendship_id_reading_friends_id_fk" FOREIGN KEY ("friendship_id") REFERENCES "public"."reading_friends"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "streak_partnerships" ADD CONSTRAINT "streak_partnerships_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "streak_partnerships" ADD CONSTRAINT "streak_partnerships_paused_by_user_id_users_id_fk" FOREIGN KEY ("paused_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "streak_partnerships_inviter_status_idx" ON "streak_partnerships" USING btree ("invited_by_user_id","status");
