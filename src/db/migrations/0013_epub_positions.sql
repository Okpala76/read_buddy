CREATE TABLE "epub_positions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "book_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "cfi" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "epub_positions_book_unique" UNIQUE("book_id")
);
--> statement-breakpoint
ALTER TABLE "epub_positions" ADD CONSTRAINT "epub_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "epub_positions" ADD CONSTRAINT "epub_positions_book_owner_fk" FOREIGN KEY ("book_id","user_id") REFERENCES "public"."books"("id","user_id") ON DELETE no action ON UPDATE no action;
