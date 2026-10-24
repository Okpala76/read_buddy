CREATE TABLE "book_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "book_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "format" text NOT NULL,
  "storage_key" text NOT NULL,
  "original_file_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "page_count" integer,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "book_documents_one_per_book_unique" UNIQUE("book_id"),
  CONSTRAINT "book_documents_id_user_id_unique" UNIQUE("id","user_id"),
  CONSTRAINT "book_documents_storage_key_unique" UNIQUE("storage_key"),
  CONSTRAINT "book_documents_format_check" CHECK ("book_documents"."format" in ('PDF', 'EPUB')),
  CONSTRAINT "book_documents_size_positive_check" CHECK ("book_documents"."size_bytes" > 0),
  CONSTRAINT "book_documents_page_count_positive_check" CHECK ("book_documents"."page_count" is null or "book_documents"."page_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "confirmed_book_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "page_number" integer NOT NULL,
  "confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "confirmed_book_pages_document_page_unique" UNIQUE("document_id","page_number"),
  CONSTRAINT "confirmed_book_pages_number_positive_check" CHECK ("confirmed_book_pages"."page_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "book_documents" ADD CONSTRAINT "book_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "book_documents" ADD CONSTRAINT "book_documents_book_owner_fk" FOREIGN KEY ("book_id","user_id") REFERENCES "public"."books"("id","user_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "confirmed_book_pages" ADD CONSTRAINT "confirmed_book_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "confirmed_book_pages" ADD CONSTRAINT "confirmed_book_pages_document_owner_fk" FOREIGN KEY ("document_id","user_id") REFERENCES "public"."book_documents"("id","user_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "book_documents_user_id_idx" ON "book_documents" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "confirmed_book_pages_user_confirmed_at_idx" ON "confirmed_book_pages" USING btree ("user_id","confirmed_at");
