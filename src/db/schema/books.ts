import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { bookStatus } from "@/db/schema/enums";
import { users } from "@/db/schema/users";

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    author: text("author").notNull(),
    totalPages: integer("total_pages").notNull(),
    currentPage: integer("current_page").notNull().default(0),
    status: bookStatus("status").notNull().default("QUEUED"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("books_id_user_id_unique").on(table.id, table.userId),
    uniqueIndex("books_one_reading_per_user_unique")
      .on(table.userId)
      .where(sql`${table.status} = 'READING'`),
    index("books_user_status_idx").on(table.userId, table.status),
    index("books_user_created_at_idx").on(table.userId, table.createdAt),
    check("books_total_pages_positive_check", sql`${table.totalPages} > 0`),
    check(
      "books_current_page_range_check",
      sql`${table.currentPage} >= 0 and ${table.currentPage} <= ${table.totalPages}`,
    ),
    check(
      "books_completion_consistency_check",
      sql`(
        ${table.status} = 'COMPLETED'
        and ${table.currentPage} = ${table.totalPages}
        and ${table.completedAt} is not null
      ) or (
        ${table.status} <> 'COMPLETED'
        and ${table.completedAt} is null
      )`,
    ),
  ],
);
