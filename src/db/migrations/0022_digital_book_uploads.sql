CREATE TABLE "digital_book_uploads" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
 "file_name" text NOT NULL,
 "content_type" text NOT NULL,
 "size_bytes" integer NOT NULL,
 "storage_key" text NOT NULL UNIQUE,
 "file_hash" text,
 "title" text,
 "author" text,
 "page_count" integer,
 "expires_at" timestamp with time zone NOT NULL,
 "completed_at" timestamp with time zone,
 "created_at" timestamp with time zone NOT NULL DEFAULT now(),
 CONSTRAINT "digital_book_uploads_size_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 52428800),
 CONSTRAINT "digital_book_uploads_type_check" CHECK ("content_type" IN ('application/pdf','application/epub+zip')),
 CONSTRAINT "digital_book_uploads_pages_check" CHECK ("page_count" IS NULL OR "page_count" > 0)
);
