import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    name: text("name"),
    image: text("image"),
    timezone: text("timezone").notNull().default("UTC"),
    dailyPageTarget: integer("daily_page_target").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_email_normalized_check",
      sql`${table.email} = lower(${table.email})`,
    ),
    check(
      "users_daily_page_target_positive_check",
      sql`${table.dailyPageTarget} > 0`,
    ),
  ],
);
