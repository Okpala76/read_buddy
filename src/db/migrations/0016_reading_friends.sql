CREATE TABLE "reading_friends" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_low_id" uuid NOT NULL,
  "user_high_id" uuid NOT NULL,
  "invited_by_user_id" uuid NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reading_friends_pair_unique" UNIQUE("user_low_id","user_high_id"),
  CONSTRAINT "reading_friends_order_check" CHECK ("user_low_id" < "user_high_id"),
  CONSTRAINT "reading_friends_inviter_check" CHECK ("invited_by_user_id" in ("user_low_id","user_high_id")),
  CONSTRAINT "reading_friends_status_check" CHECK ("status" in ('PENDING','ACCEPTED','DECLINED'))
);
--> statement-breakpoint
ALTER TABLE "reading_friends" ADD CONSTRAINT "reading_friends_user_low_id_users_id_fk" FOREIGN KEY ("user_low_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reading_friends" ADD CONSTRAINT "reading_friends_user_high_id_users_id_fk" FOREIGN KEY ("user_high_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reading_friends" ADD CONSTRAINT "reading_friends_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "reading_friends_low_status_idx" ON "reading_friends" USING btree ("user_low_id","status");
--> statement-breakpoint
CREATE INDEX "reading_friends_high_status_idx" ON "reading_friends" USING btree ("user_high_id","status");
