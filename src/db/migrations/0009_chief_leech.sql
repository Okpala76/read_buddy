CREATE TABLE "reading_behavior_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sample_days" integer NOT NULL,
	"typical_reading_minute" integer NOT NULL,
	"weekday_sample_days" integer NOT NULL,
	"weekday_typical_minute" integer,
	"weekend_sample_days" integer NOT NULL,
	"weekend_typical_minute" integer,
	"window_start" timestamp with time zone NOT NULL,
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reading_behavior_profiles" ADD CONSTRAINT "reading_behavior_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reading_behavior_profiles_computed_at_idx" ON "reading_behavior_profiles" USING btree ("computed_at");