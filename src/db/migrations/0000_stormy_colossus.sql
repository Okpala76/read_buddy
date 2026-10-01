CREATE TYPE "public"."book_status" AS ENUM('QUEUED', 'READING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."reading_mood" AS ENUM('FOCUSED', 'RELAXED', 'ENERGIZED', 'DISTRACTED', 'TIRED');--> statement-breakpoint
CREATE TYPE "public"."reminder_delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_expires_future_check" CHECK ("sessions"."expires" > now())
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_expires_future_check" CHECK ("verification_tokens"."expires" > now())
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"total_pages" integer NOT NULL,
	"current_page" integer DEFAULT 0 NOT NULL,
	"status" "book_status" DEFAULT 'QUEUED' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "books_total_pages_positive_check" CHECK ("books"."total_pages" > 0),
	CONSTRAINT "books_current_page_range_check" CHECK ("books"."current_page" >= 0 and "books"."current_page" <= "books"."total_pages"),
	CONSTRAINT "books_completion_consistency_check" CHECK ((
        "books"."status" = 'COMPLETED'
        and "books"."current_page" = "books"."total_pages"
        and "books"."completed_at" is not null
      ) or (
        "books"."status" <> 'COMPLETED'
        and "books"."completed_at" is null
      ))
);
--> statement-breakpoint
CREATE TABLE "reading_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"start_page" integer NOT NULL,
	"end_page" integer NOT NULL,
	"pages_read" integer NOT NULL,
	"mood" "reading_mood",
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_sessions_page_range_check" CHECK ("reading_sessions"."start_page" >= 0 and "reading_sessions"."end_page" > "reading_sessions"."start_page"),
	CONSTRAINT "reading_sessions_pages_read_check" CHECK ("reading_sessions"."pages_read" = "reading_sessions"."end_page" - "reading_sessions"."start_page")
);
--> statement-breakpoint
CREATE TABLE "reminder_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "reminder_delivery_status" DEFAULT 'PENDING' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"provider_message_id" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_deliveries_attempt_count_check" CHECK ("reminder_deliveries"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reminder_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"reminder_time" time DEFAULT '19:00:00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"name" text,
	"image" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"daily_page_target" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_normalized_check" CHECK ("users"."email" = lower("users"."email")),
	CONSTRAINT "users_daily_page_target_positive_check" CHECK ("users"."daily_page_target" > 0)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_owner_fk" FOREIGN KEY ("book_id","user_id") REFERENCES "public"."books"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_deliveries" ADD CONSTRAINT "reminder_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_preferences" ADD CONSTRAINT "reminder_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_unique" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_identifier_token_unique" ON "verification_tokens" USING btree ("identifier","token");--> statement-breakpoint
CREATE UNIQUE INDEX "books_one_reading_per_user_unique" ON "books" USING btree ("user_id") WHERE "books"."status" = 'READING';--> statement-breakpoint
CREATE INDEX "books_user_status_idx" ON "books" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "books_user_created_at_idx" ON "books" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reading_sessions_user_read_at_idx" ON "reading_sessions" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "reading_sessions_book_read_at_idx" ON "reading_sessions" USING btree ("book_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_deliveries_user_scheduled_unique" ON "reminder_deliveries" USING btree ("user_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "reminder_deliveries_status_scheduled_idx" ON "reminder_deliveries" USING btree ("status","scheduled_for");