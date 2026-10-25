CREATE TABLE "gutenberg_catalog" (
  "id" integer PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "author" text NOT NULL,
  "language" text NOT NULL,
  "epub_url" text NOT NULL,
  "cover_url" text,
  "imported_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "gutenberg_catalog_epub_https_check" CHECK ("epub_url" LIKE 'https://%')
);
--> statement-breakpoint
CREATE INDEX "gutenberg_catalog_title_idx" ON "gutenberg_catalog" USING btree ("title");
--> statement-breakpoint
CREATE INDEX "gutenberg_catalog_author_idx" ON "gutenberg_catalog" USING btree ("author");
