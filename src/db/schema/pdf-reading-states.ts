import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { bookDocuments } from "./book-documents";
import { users } from "./users";

/** PDF page numbers are independent of historical physical-edition pages. */
export const pdfReadingStates = pgTable(
  "pdf_reading_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    pageCount: integer("page_count").notNull(),
    alignedPhysicalPage: integer("aligned_physical_page").notNull(),
    confirmedPage: integer("confirmed_page").notNull(),
    viewedPage: integer("viewed_page").notNull(),
    alignedAt: timestamp("aligned_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("pdf_reading_states_document_unique").on(table.documentId),
    foreignKey({
      columns: [table.documentId, table.userId],
      foreignColumns: [bookDocuments.id, bookDocuments.userId],
      name: "pdf_reading_states_document_owner_fk",
    }).onDelete("no action"),
    check("pdf_reading_states_page_range_check",
      sql`${table.pageCount} > 0 and ${table.alignedPhysicalPage} >= 0 and ${table.confirmedPage} >= 0 and ${table.confirmedPage} <= ${table.pageCount} and ${table.viewedPage} > 0 and ${table.viewedPage} <= ${table.pageCount}`),
  ],
);
