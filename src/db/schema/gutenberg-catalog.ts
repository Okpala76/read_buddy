import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const gutenbergCatalog = pgTable(
  "gutenberg_catalog",
  {
    id: integer("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    language: text("language").notNull(),
    epubUrl: text("epub_url").notNull(),
    coverUrl: text("cover_url"),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("gutenberg_catalog_title_idx").on(table.title),
    index("gutenberg_catalog_author_idx").on(table.author),
  ],
);
