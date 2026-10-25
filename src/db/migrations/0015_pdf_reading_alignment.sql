CREATE TABLE "pdf_reading_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "page_count" integer NOT NULL,
  "aligned_physical_page" integer NOT NULL,
  "confirmed_page" integer NOT NULL,
  "viewed_page" integer NOT NULL,
  "aligned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pdf_reading_states_document_unique" UNIQUE("document_id"),
  CONSTRAINT "pdf_reading_states_page_range_check" CHECK ("page_count" > 0 AND "aligned_physical_page" >= 0 AND "confirmed_page" >= 0 AND "confirmed_page" <= "page_count" AND "viewed_page" > 0 AND "viewed_page" <= "page_count")
);
--> statement-breakpoint
ALTER TABLE "pdf_reading_states" ADD CONSTRAINT "pdf_reading_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pdf_reading_states" ADD CONSTRAINT "pdf_reading_states_document_owner_fk" FOREIGN KEY ("document_id","user_id") REFERENCES "public"."book_documents"("id","user_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "source" text DEFAULT 'PHYSICAL' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_source_check" CHECK ("source" in ('PHYSICAL','PDF','EPUB'));
