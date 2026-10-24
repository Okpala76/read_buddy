import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { books } from "@/db/schema/books";
import { users } from "@/db/schema/users";

/**
 * One optional digital reference per library book.
 * Existing book rows without documents continue to mean physical/off-app reading.
 * The owner and book stay linked by a composite FK; file bytes never live in Postgres.
 */
export const bookDocuments = pgTable(
  "book_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    format: text("format").notNull(),
    storageKey: text("storage_key").notNull(),
    originalFileName: text("original_file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pageCount: integer("page_count"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("book_documents_one_per_book_unique").on(table.bookId),
    unique("book_documents_id_user_id_unique").on(table.id, table.userId),
    unique("book_documents_storage_key_unique").on(table.storageKey),
    foreignKey({
      columns: [table.bookId, table.userId],
      foreignColumns: [books.id, books.userId],
      name: "book_documents_book_owner_fk",
    }).onDelete("no action"),
    index("book_documents_user_id_idx").on(table.userId),
    check("book_documents_format_check", sql`${table.format} in ('PDF', 'EPUB')`),
    check("book_documents_size_positive_check", sql`${table.sizeBytes} > 0`),
    check(
      "book_documents_page_count_positive_check",
      sql`${table.pageCount} is null or ${table.pageCount} > 0`,
    ),
  ],
);

/**
 * An explicit confirmation is independent of the currently viewed page.
 * The reader must never infer this record from navigation, scroll, or elapsed time.
 */
export const confirmedBookPages = pgTable(
  "confirmed_book_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("confirmed_book_pages_document_page_unique").on(
      table.documentId,
      table.pageNumber,
    ),
    foreignKey({
      columns: [table.documentId, table.userId],
      foreignColumns: [bookDocuments.id, bookDocuments.userId],
      name: "confirmed_book_pages_document_owner_fk",
    }).onDelete("no action"),
    index("confirmed_book_pages_user_confirmed_at_idx").on(
      table.userId,
      table.confirmedAt,
    ),
    check(
      "confirmed_book_pages_number_positive_check",
      sql`${table.pageNumber} > 0`,
    ),
  ],
);
