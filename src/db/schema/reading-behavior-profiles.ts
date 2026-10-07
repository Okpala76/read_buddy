import { index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "@/db/schema/users";

export const readingBehaviorProfiles = pgTable(
  "reading_behavior_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    sampleDays: integer("sample_days").notNull(),
    typicalReadingMinute: integer("typical_reading_minute").notNull(),
    weekdaySampleDays: integer("weekday_sample_days").notNull(),
    weekdayTypicalMinute: integer("weekday_typical_minute"),
    weekendSampleDays: integer("weekend_sample_days").notNull(),
    weekendTypicalMinute: integer("weekend_typical_minute"),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("reading_behavior_profiles_computed_at_idx").on(table.computedAt),
  ],
);
