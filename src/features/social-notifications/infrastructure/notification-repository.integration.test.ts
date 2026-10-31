import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  books,
  readingSessions,
  users,
  readingFriends,
  streakPartnerships,
  streakNudges,
  streakMilestones,
  milestoneCongratulations,
} from "@/db/schema";
vi.mock("server-only", () => ({}));
describe.runIf(process.env.RUN_DATABASE_INTEGRATION_TESTS === "true")(
  "Reading social safeguards in PostgreSQL",
  () => {
    let db: NonNullable<typeof import("@/db/client").db>;
    let pool: NonNullable<typeof import("@/db/client").databasePool>;
    let repo: typeof import("./notification-repository");
    let nudges: typeof import("@/features/streak-buddies/infrastructure/nudge-repository");
    let milestones: typeof import("@/features/streak-buddies/infrastructure/milestone-repository");
    const a = crypto.randomUUID(),
      c = crypto.randomUUID(),
      r = crypto.randomUUID(),
      x = crypto.randomUUID();
    const now = new Date("2026-11-01T00:30:00Z");
    beforeAll(async () => {
      const client = await import("@/db/client");
      db = client.db!;
      pool = client.databasePool!;
      repo = await import("./notification-repository");
      nudges =
        await import("@/features/streak-buddies/infrastructure/nudge-repository");
      milestones =
        await import("@/features/streak-buddies/infrastructure/milestone-repository");
    });
    async function reading(userId: string, readAt = now) {
      const id = crypto.randomUUID();
      await db.insert(books).values({
        id,
        userId,
        title: "Private book",
        author: "Private author",
        totalPages: 100,
        currentPage: 1,
        status: "READING",
      });
      await db.insert(readingSessions).values({
        userId,
        bookId: id,
        startPage: 0,
        endPage: 1,
        pagesRead: 1,
        readAt,
        source: "PHYSICAL",
      });
    }
    async function friendship(sender: string, status = "ACTIVE") {
      const pair = [sender, r].sort();
      const [friend] = await db
        .insert(readingFriends)
        .values({
          userLowId: pair[0],
          userHighId: pair[1],
          invitedByUserId: sender,
          status: "ACCEPTED",
        })
        .returning();
      await db.insert(streakPartnerships).values({
        friendshipId: friend.id,
        invitedByUserId: sender,
        status,
        pausedByUserId: status === "PAUSED" ? r : null,
      });
      return friend.id;
    }
    const send = (sender = a) =>
      nudges.sendDailyNudges({ id: sender, timezone: "UTC" }, now);
    beforeEach(async () => {
      await db.insert(users).values(
        [a, c, r, x].map((id) => ({
          id,
          email: `${id}@example.com`,
          name: id === a ? "Sender" : "Reader",
          timezone: id === r ? "America/Los_Angeles" : "UTC",
        })),
      );
      await reading(a);
      await reading(c);
      await friendship(a);
      await friendship(c);
    });
    afterEach(async () => {
      await db.delete(users).where(inArray(users.id, [a, c, r, x]));
    });
    afterAll(async () => {
      if (pool) await pool.end();
    });
    it("deduplicates concurrent same-sender nudge batches", async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () => send()),
      );
      expect(results.filter((result) => result.alreadySent)).toHaveLength(4);
      expect(
        await db
          .select()
          .from(streakNudges)
          .where(eq(streakNudges.recipientId, r)),
      ).toHaveLength(1);
    });
    it("allows at most one recipient-local-day nudge from competing buddies", async () => {
      await Promise.all([send(a), send(c)]);
      const rows = await db
        .select()
        .from(streakNudges)
        .where(eq(streakNudges.recipientId, r));
      expect(rows).toHaveLength(1);
      expect(rows[0].recipientDay).toBe("2026-10-31");
    });
    it("respects local already-read status even when that log was on the previous UTC date", async () => {
      await reading(r, new Date("2026-10-31T10:00:00Z"));
      expect((await send()).sent).toBe(0);
    });
    it("enforces recipient opt-out and requires the sender to have read", async () => {
      await repo.writeSocialPreferences(r, {
        receiveNudges: false,
        shareMilestones: true,
      });
      expect((await send()).sent).toBe(0);
      await expect(send(x)).rejects.toThrow("first reading session");
    });
    it("skips paused partnerships and removed friendships", async () => {
      await db
        .update(streakPartnerships)
        .set({ status: "PAUSED", pausedByUserId: r })
        .where(inArray(streakPartnerships.invitedByUserId, [a, c]));
      expect((await send()).sent).toBe(0);
      await db
        .update(readingFriends)
        .set({ status: "DECLINED" })
        .where(inArray(readingFriends.invitedByUserId, [a, c]));
      expect((await send(c)).sent).toBe(0);
    });
    it("isolates inboxes, read status, and emoji reactions by message owner", async () => {
      await send();
      const [item] = await repo.readNotifications(r);
      expect(await repo.readNotifications(x)).toEqual([]);
      await expect(
        repo.updateNotification(x, { id: item.id, kind: "NUDGE" }),
      ).rejects.toThrow("not found");
      await expect(
        repo.updateNotification(a, {
          id: item.id,
          kind: "NUDGE",
          reaction: "👏",
        }),
      ).rejects.toThrow("not found");
      await repo.updateNotification(r, {
        id: item.id,
        kind: "NUDGE",
        reaction: "👏",
      });
      expect((await repo.readNotifications(r))[0]).toMatchObject({
        read: true,
        reaction: "👏",
      });
      expect((await repo.readNotifications(a))[0]).toMatchObject({
        kind: "NUDGE_REACTION",
        read: false,
        reaction: "👏",
      });
      await repo.updateNotification(a, { id: item.id, kind: "NUDGE_REACTION" });
      await repo.updateNotification(r, {
        id: item.id,
        kind: "NUDGE",
        reaction: "👏",
      });
      expect((await repo.readNotifications(a))[0].read).toBe(true);
      await expect(
        repo.updateNotification(a, {
          id: item.id,
          kind: "NUDGE_REACTION",
          reaction: "❤️",
        }),
      ).rejects.toThrow("further reactions");
    });
    it("combines congratulations with nudges and returns reactions to their actual sender", async () => {
      await send();
      const [event] = await db
        .insert(streakMilestones)
        .values({ userId: r, days: 10, localDay: "2026-10-31" })
        .returning();
      await milestones.congratulateFriendMilestone(a, event.id);
      const inbox = await repo.readNotifications(r);
      expect(inbox).toHaveLength(2);
      const item = inbox.find((n) => n.kind === "CONGRATULATION")!;
      await repo.updateNotification(r, {
        id: item.id,
        kind: item.kind,
        reaction: "❤️",
      });
      expect(
        (await repo.readNotifications(a)).find(
          (n) => n.kind === "CONGRATULATION_REACTION",
        ),
      ).toMatchObject({ days: 10, reaction: "❤️" });
      expect(await repo.readNotifications(c)).toEqual([]);
      expect(JSON.stringify(inbox)).not.toMatch(/Private book|Private author/);
    });
    it("hides opted-out milestones and blocks stale congratulations prompts", async () => {
      const [event] = await db
        .insert(streakMilestones)
        .values({ userId: r, days: 10, localDay: "2026-10-31" })
        .returning();
      await repo.writeSocialPreferences(r, {
        receiveNudges: true,
        shareMilestones: false,
      });
      expect(await milestones.readFriendMilestones(a)).toEqual([]);
      await expect(
        milestones.congratulateFriendMilestone(a, event.id),
      ).rejects.toThrow("not available");
      expect(
        await db
          .select()
          .from(milestoneCongratulations)
          .where(eq(milestoneCongratulations.milestoneId, event.id)),
      ).toHaveLength(0);
    });
    it("prevents new emoji deliveries to a removed friend", async () => {
      await send();
      const [item] = await repo.readNotifications(r);
      await db
        .update(readingFriends)
        .set({ status: "DECLINED" })
        .where(inArray(readingFriends.invitedByUserId, [a, c]));
      await expect(
        repo.updateNotification(r, {
          id: item.id,
          kind: item.kind,
          reaction: "🙌",
        }),
      ).rejects.toThrow("current friends");
    });
  },
);
