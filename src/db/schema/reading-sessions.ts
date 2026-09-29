import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { books } from "@/db/schema/books";
import { readingMood } from "@/db/schema/enums";
import { users } from "@/db/schema/users";

export const readingSessions = pgTable(
  "reading_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: uuid("book_id").notNull(),
    startPage: integer("start_page").notNull(),
    endPage: integer("end_page").notNull(),
    pagesRead: integer("pages_read").notNull(),
    mood: readingMood("mood"),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookId, table.userId],
      foreignColumns: [books.id, books.userId],
      name: "reading_sessions_book_owner_fk",
    }).onDelete("no action"),
    index("reading_sessions_user_read_at_idx").on(table.userId, table.readAt),
    index("reading_sessions_book_read_at_idx").on(table.bookId, table.readAt),
    check(
      "reading_sessions_page_range_check",
      sql`${table.startPage} >= 0 and ${table.endPage} > ${table.startPage}`,
    ),
    check(
      "reading_sessions_pages_read_check",
      sql`${table.pagesRead} = ${table.endPage} - ${table.startPage}`,
    ),
  ],
);
