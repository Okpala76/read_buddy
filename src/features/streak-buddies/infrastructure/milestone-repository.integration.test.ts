import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  users,
  readingFriends,
  streakMilestones,
  milestoneCongratulations,
} from "@/db/schema";
vi.mock("server-only", () => ({}));
describe.runIf(process.env.RUN_DATABASE_INTEGRATION_TESTS === "true")(
  "Milestone PostgreSQL authorization and concurrency",
  () => {
    let database: NonNullable<typeof import("@/db/client").db>;
    let pool: NonNullable<typeof import("@/db/client").databasePool>;
    let repo: typeof import("./milestone-repository");
    const owner = crypto.randomUUID(),
      friend = crypto.randomUUID(),
      stranger = crypto.randomUUID();
    const milestone = crypto.randomUUID();
    beforeAll(async () => {
      const client = await import("@/db/client");
      database = client.db!;
      pool = client.databasePool!;
      repo = await import("./milestone-repository");
      await database.insert(users).values(
        [owner, friend, stranger].map((id) => ({
          id,
          email: `${id}@example.com`,
          timezone: "UTC",
        })),
      );
      const pair = [owner, friend].sort();
      await database.insert(readingFriends).values({
        userLowId: pair[0],
        userHighId: pair[1],
        invitedByUserId: owner,
        status: "ACCEPTED",
      });
      await database.insert(streakMilestones).values({
        id: milestone,
        userId: owner,
        days: 10,
        localDay: "2026-10-31",
      });
    });
    afterAll(async () => {
      if (database)
        await database
          .delete(users)
          .where(inArray(users.id, [owner, friend, stranger]));
      if (pool) await pool.end();
    });
    it("shows milestones to accepted friends without requiring a streak partnership", async () => {
      expect(await repo.readFriendMilestones(friend)).toEqual([
        expect.objectContaining({ id: milestone, sent: false }),
      ]);
      expect(await repo.readFriendMilestones(stranger)).toEqual([]);
      expect(await repo.readFriendMilestones(owner)).toEqual([]);
    });
    it("rejects outsiders and self-congratulations", async () => {
      await expect(
        repo.congratulateFriendMilestone(stranger, milestone),
      ).rejects.toThrow("not available");
      await expect(
        repo.congratulateFriendMilestone(owner, milestone),
      ).rejects.toThrow("not available");
    });
    it("stores one delivery under concurrent sends and isolates the recipient inbox", async () => {
      await Promise.all(
        Array.from({ length: 4 }, () =>
          repo.congratulateFriendMilestone(friend, milestone),
        ),
      );
      const rows = await database
        .select()
        .from(milestoneCongratulations)
        .where(eq(milestoneCongratulations.milestoneId, milestone));
      expect(rows).toHaveLength(1);
      expect(await repo.readReceivedCongratulations(owner)).toHaveLength(1);
      expect(await repo.readReceivedCongratulations(stranger)).toEqual([]);
      expect(await repo.readFriendMilestones(friend)).toEqual([
        expect.objectContaining({ sent: true }),
      ]);
    });
    it("rejects sends and hides prompts after the friendship ends", async () => {
      await database
        .update(readingFriends)
        .set({ status: "DECLINED" })
        .where(eq(readingFriends.invitedByUserId, owner));
      expect(await repo.readFriendMilestones(friend)).toEqual([]);
      await expect(
        repo.congratulateFriendMilestone(friend, milestone),
      ).rejects.toThrow("not available");
    });
  },
);
