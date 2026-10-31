import { boolean, pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
export const socialPreferences = pgTable("social_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  receiveNudges: boolean("receive_nudges").notNull().default(true),
  shareMilestones: boolean("share_milestones").notNull().default(true),
});
