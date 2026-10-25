import {
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { books } from "@/db/schema/books";
import { users } from "@/db/schema/users";

/** EPUB CFI is reflow-safe; separate from printed-page reading progress. */
export const epubPositions = pgTable(
  "epub_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cfi: text("cfi").notNull(),
    locationIndex: integer("location_index"),
    locationTotal: integer("location_total"),
    progressPercent: integer("progress_percent"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("epub_positions_book_unique").on(table.bookId),
    foreignKey({
      columns: [table.bookId, table.userId],
      foreignColumns: [books.id, books.userId],
      name: "epub_positions_book_owner_fk",
    }).onDelete("no action"),
  ],
);
