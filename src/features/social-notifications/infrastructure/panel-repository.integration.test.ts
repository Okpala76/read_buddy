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
  users,
  inAppReminders,
  readingFriends,
  streakPartnerships,
  streakMilestones,
  books,
  readingSessions,
  reminderPreferences,
  milestoneCongratulations,
} from "@/db/schema";
vi.mock("server-only", () => ({}));
describe.runIf(process.env.RUN_DATABASE_INTEGRATION_TESTS === "true")(
  "Notification panel PostgreSQL feed",
  () => {
    let db: NonNullable<typeof import("@/db/client").db>,
      pool: NonNullable<typeof import("@/db/client").databasePool>,
      repo: typeof import("./panel-repository");
    const a = crypto.randomUUID(),
      b = crypto.randomUUID(),
      x = crypto.randomUUID();
    beforeAll(async () => {
      const c = await import("@/db/client");
      db = c.db!;
      pool = c.databasePool!;
      repo = await import("./panel-repository");
    });
    beforeEach(async () => {
      await db.insert(users).values(
        [a, b, x].map((id) => ({
          id,
          email: `${id}@example.com`,
          timezone: "Africa/Lagos",
        })),
      );
    });
    afterEach(async () => {
      await db.delete(users).where(inArray(users.id, [a, b, x]));
    });
    afterAll(async () => {
      if (pool) await pool.end();
    });
    async function friend(status = "PENDING") {
      const p = [a, b].sort();
      const [f] = await db
        .insert(readingFriends)
        .values({
          userLowId: p[0],
          userHighId: p[1],
          invitedByUserId: a,
          status,
        })
        .returning();
      return f;
    }
    it("counts unread beyond the visible list and persists scoped idempotent reads", async () => {
      await db.insert(inAppReminders).values(
        Array.from({ length: 80 }, (_, i) => ({
          userId: b,
          localDay: `day-${i}`,
          createdAt: new Date(Date.UTC(2026, 0, i + 1, 12)),
        })),
      );
      const data = await repo.readPanel(b, 50);
      expect(data.items).toHaveLength(50);
      expect(data.unreadCount).toBe(80);
      expect(data.hasMore).toBe(true);
      expect((await repo.readPanel(x)).unreadCount).toBe(0);
      const item = data.items[0];
      await expect(
        repo.markPanelItemRead(x, item.id, item.kind),
      ).rejects.toThrow("not found");
      await Promise.all([
        repo.markPanelItemRead(b, item.id, item.kind),
        repo.markPanelItemRead(b, item.id, item.kind),
      ]);
      expect((await repo.readPanel(b)).unreadCount).toBe(79);
      expect((await repo.readPanel(b, 100)).items).toHaveLength(80);
    });
    it("includes only the recipient's pending friendship and streak invitations", async () => {
      const f = await friend();
      let data = await repo.readPanel(b);
      expect(data.items).toEqual([
        expect.objectContaining({ kind: "FRIEND_INVITE", id: f.id }),
      ]);
      expect((await repo.readPanel(a)).items).toEqual([]);
      expect((await repo.readPanel(x)).items).toEqual([]);
      await repo.markPanelItemRead(b, f.id, "FRIEND_INVITE");
      expect((await repo.readPanel(b)).unreadCount).toBe(0);
      await db
        .update(readingFriends)
        .set({ status: "ACCEPTED" })
        .where(eq(readingFriends.id, f.id));
      const [p] = await db
        .insert(streakPartnerships)
        .values({ friendshipId: f.id, invitedByUserId: a, status: "PENDING" })
        .returning();
      data = await repo.readPanel(b);
      expect(data.items).toEqual([
        expect.objectContaining({ kind: "STREAK_INVITE", id: p.id }),
      ]);
      await db
        .update(streakPartnerships)
        .set({ status: "ACTIVE" })
        .where(eq(streakPartnerships.id, p.id));
      expect((await repo.readPanel(b)).items).toEqual([]);
    });
    it("offers accepted-friend milestones until congratulations are sent", async () => {
      await friend("ACCEPTED");
      const [m] = await db
        .insert(streakMilestones)
        .values({ userId: a, days: 10, localDay: "2026-10-31" })
        .returning();
      expect((await repo.readPanel(b)).items).toEqual([
        expect.objectContaining({ kind: "MILESTONE", days: 10 }),
      ]);
      expect((await repo.readPanel(x)).items).toEqual([]);
      await db
        .insert(milestoneCongratulations)
        .values({ milestoneId: m.id, senderId: b });
      expect((await repo.readPanel(b)).items).toEqual([]);
      expect((await repo.readPanel(a)).items).toEqual([
        expect.objectContaining({ kind: "CONGRATULATION" }),
      ]);
    });
    it("creates reading-time reminders once per local day despite external delivery being disabled", async () => {
      await db.insert(reminderPreferences).values({
        userId: b,
        enabled: false,
        emailEnabled: false,
        reminderTime: "19:00:00",
      });
      await db.insert(books).values({
        userId: b,
        title: "Private title",
        author: "Author",
        totalPages: 100,
        status: "READING",
      });
      const user = { id: b, timezone: "Africa/Lagos" };
      await repo.ensureReadingReminder(user, new Date("2026-10-31T17:59:00Z"));
      expect((await repo.readPanel(b)).items).toEqual([]);
      await Promise.all([
        repo.ensureReadingReminder(user, new Date("2026-10-31T18:01:00Z")),
        repo.ensureReadingReminder(user, new Date("2026-10-31T18:01:00Z")),
      ]);
      const data = await repo.readPanel(b);
      expect(data.items).toHaveLength(1);
      expect(data.items[0]).toMatchObject({
        kind: "READING_REMINDER",
        createdAt: "2026-10-31T18:00:00.000Z",
      });
      expect(JSON.stringify(data)).not.toContain("Private title");
    });
    it("skips reading-time reminders when already read or no active book exists", async () => {
      const user = { id: b, timezone: "Africa/Lagos" },
        now = new Date("2026-10-31T20:00:00Z");
      await repo.ensureReadingReminder(user, now);
      expect((await repo.readPanel(b)).items).toEqual([]);
      const [book] = await db
        .insert(books)
        .values({
          userId: b,
          title: "Book",
          author: "Author",
          totalPages: 100,
          status: "READING",
        })
        .returning();
      await db.insert(readingSessions).values({
        userId: b,
        bookId: book.id,
        startPage: 0,
        endPage: 1,
        pagesRead: 1,
        readAt: now,
      });
      await repo.ensureReadingReminder(user, now);
      expect((await repo.readPanel(b)).items).toEqual([]);
    });
  },
);
