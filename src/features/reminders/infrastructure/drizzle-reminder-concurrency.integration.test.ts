import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { asc, eq } from "drizzle-orm";

import {
  books,
  readingSessions,
  reminderDeliveries,
  reminderPreferences,
  pushSubscriptions,
  users,
} from "@/db/schema";

vi.mock("server-only", () => ({}));

const runIntegrationTests =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true";

describe.runIf(runIntegrationTests)(
  "DrizzleReminderDispatchRepository PostgreSQL concurrency",
  () => {
    let database: NonNullable<typeof import("@/db/client").db>;
    let databasePool: NonNullable<typeof import("@/db/client").databasePool>;
    let Repository: typeof import("./drizzle-reminder-repository").DrizzleReminderDispatchRepository;
    let initialized = false;
    const userId = crypto.randomUUID();
    const recipientEmail = `reminder-${userId}@example.com`;
    const deliverySnapshot = { recipientEmail, dailyPageTarget: 10 };

    beforeAll(async () => {
      const client = await import("@/db/client");
      const repositoryModule = await import("./drizzle-reminder-repository");
      if (!client.db || !client.databasePool) {
        throw new Error("Local PostgreSQL is required for integration tests");
      }
      database = client.db;
      databasePool = client.databasePool;
      Repository = repositoryModule.DrizzleReminderDispatchRepository;

      await database.insert(users).values({
        id: userId,
        email: recipientEmail,
        timezone: "UTC",
      });
      initialized = true;
    });

    afterEach(async () => {
      await database
        .delete(readingSessions)
        .where(eq(readingSessions.userId, userId));
      await database.delete(books).where(eq(books.userId, userId));
      await database
        .delete(reminderDeliveries)
        .where(eq(reminderDeliveries.userId, userId));
      await database
        .delete(reminderPreferences)
        .where(eq(reminderPreferences.userId, userId));
    });

    afterAll(async () => {
      if (!initialized) return;
      await database.delete(users).where(eq(users.id, userId));
      await databasePool.end();
    });

    it("allows two workers to claim a row only once", async () => {
      const now = new Date("2026-10-05T18:05:00.000Z");
      await database.insert(reminderDeliveries).values({
        id: crypto.randomUUID(),
        userId,
        ...deliverySnapshot,
        scheduledFor: new Date("2026-10-05T18:00:00.000Z"),
      });
      const workerA = new Repository();
      const workerB = new Repository();

      const claims = await Promise.all([
        workerA.claimDueDeliveries(now, 1, 3),
        workerB.claimDueDeliveries(now, 1, 3),
      ]);
      const claimed = claims.flat();

      expect(claimed).toHaveLength(1);
      expect(claimed[0].status).toBe("PROCESSING");
      expect(claimed[0].lockedAt).toEqual(now);
      expect(claimed[0].attemptCount).toBe(0);
    });

    it("allows two workers to claim a due failed retry only once", async () => {
      const now = new Date("2026-10-05T18:05:00.000Z");
      const dueRetryId = crypto.randomUUID();
      await database.insert(reminderDeliveries).values([
        {
          id: dueRetryId,
          userId,
          ...deliverySnapshot,
          status: "FAILED",
          deliveryChannel: "EMAIL",
          scheduledFor: new Date("2026-10-05T18:01:00.000Z"),
          attemptCount: 1,
          nextAttemptAt: new Date("2026-10-05T18:05:00.000Z"),
          errorCode: "RESEND_TIMEOUT",
        },
        {
          id: crypto.randomUUID(),
          userId,
          ...deliverySnapshot,
          status: "FAILED",
          deliveryChannel: "EMAIL",
          scheduledFor: new Date("2026-10-05T18:02:00.000Z"),
          attemptCount: 1,
          nextAttemptAt: new Date("2026-10-05T18:06:00.000Z"),
          errorCode: "RESEND_TIMEOUT",
        },
        {
          id: crypto.randomUUID(),
          userId,
          ...deliverySnapshot,
          status: "FAILED",
          deliveryChannel: "EMAIL",
          scheduledFor: new Date("2026-10-05T18:00:00.000Z"),
          attemptCount: 3,
          nextAttemptAt: new Date("2026-10-05T18:04:00.000Z"),
          errorCode: "RESEND_SERVER_ERROR",
        },
      ]);
      const workerA = new Repository();
      const workerB = new Repository();

      const claims = await Promise.all([
        workerA.claimDueDeliveries(now, 10, 3),
        workerB.claimDueDeliveries(now, 10, 3),
      ]);
      const claimed = claims.flat();

      expect(claimed).toHaveLength(1);
      expect(claimed[0].id).toBe(dueRetryId);
      expect(claimed[0].status).toBe("PROCESSING");
      expect(claimed[0].attemptCount).toBe(1);
    });

    it("never reclaims sent or skipped deliveries", async () => {
      const now = new Date("2026-10-05T18:05:00.000Z");
      await database.insert(reminderDeliveries).values([
        {
          id: crypto.randomUUID(),
          userId,
          ...deliverySnapshot,
          status: "SENT",
          deliveryChannel: "EMAIL",
          scheduledFor: new Date("2026-10-05T17:59:00.000Z"),
          sentAt: new Date("2026-10-05T18:00:00.000Z"),
          attemptCount: 1,
        },
        {
          id: crypto.randomUUID(),
          userId,
          ...deliverySnapshot,
          status: "SKIPPED",
          scheduledFor: new Date("2026-10-05T18:00:00.000Z"),
          skipReason: "NO_ACTIVE_BOOK",
        },
      ]);

      const claimed = await new Repository().claimDueDeliveries(now, 10, 3);

      expect(claimed).toEqual([]);
    });

    it("recovers stale processing rows but leaves fresh claims untouched", async () => {
      const now = new Date("2026-10-05T18:20:00.000Z");
      await database.insert(reminderDeliveries).values([
        {
          id: crypto.randomUUID(),
          userId,
          ...deliverySnapshot,
          status: "PROCESSING",
          scheduledFor: new Date("2026-10-05T18:00:00.000Z"),
          lockedAt: new Date("2026-10-05T18:09:00.000Z"),
        },
        {
          id: crypto.randomUUID(),
          userId,
          ...deliverySnapshot,
          status: "PROCESSING",
          scheduledFor: new Date("2026-10-05T18:01:00.000Z"),
          lockedAt: new Date("2026-10-05T18:15:00.000Z"),
        },
      ]);
      const repository = new Repository();

      const recovered = await repository.recoverStaleClaims(
        new Date("2026-10-05T18:10:00.000Z"),
        now,
      );
      const rows = await database
        .select({
          status: reminderDeliveries.status,
          lockedAt: reminderDeliveries.lockedAt,
          attemptCount: reminderDeliveries.attemptCount,
        })
        .from(reminderDeliveries)
        .where(eq(reminderDeliveries.userId, userId))
        .orderBy(asc(reminderDeliveries.scheduledFor));

      expect(recovered).toBe(1);
      expect(rows).toEqual([
        { status: "PENDING", lockedAt: null, attemptCount: 0 },
        {
          status: "PROCESSING",
          lockedAt: new Date("2026-10-05T18:15:00.000Z"),
          attemptCount: 0,
        },
      ]);
    });

    it("recovers a stale retry claim back to failed", async () => {
      const now = new Date("2026-10-05T18:20:00.000Z");
      const retryAt = new Date("2026-10-05T18:05:00.000Z");
      const deliveryId = crypto.randomUUID();
      await database.insert(reminderDeliveries).values({
        id: deliveryId,
        userId,
        ...deliverySnapshot,
        status: "PROCESSING",
        deliveryChannel: "EMAIL",
        scheduledFor: new Date("2026-10-05T18:00:00.000Z"),
        lockedAt: new Date("2026-10-05T18:09:00.000Z"),
        attemptCount: 1,
        nextAttemptAt: retryAt,
        errorCode: "RESEND_TIMEOUT",
      });

      await new Repository().recoverStaleClaims(
        new Date("2026-10-05T18:10:00.000Z"),
        now,
      );
      const [row] = await database
        .select({
          status: reminderDeliveries.status,
          deliveryChannel: reminderDeliveries.deliveryChannel,
          nextAttemptAt: reminderDeliveries.nextAttemptAt,
          attemptCount: reminderDeliveries.attemptCount,
        })
        .from(reminderDeliveries)
        .where(eq(reminderDeliveries.id, deliveryId));

      expect(row).toEqual({
        status: "FAILED",
        deliveryChannel: "EMAIL",
        nextAttemptAt: retryAt,
        attemptCount: 1,
      });
    });

    it("rejects a result from a worker whose claim was recovered", async () => {
      const firstClaimAt = new Date("2026-10-05T18:00:00.000Z");
      const secondClaimAt = new Date("2026-10-05T18:20:00.000Z");
      await database.insert(reminderDeliveries).values({
        id: crypto.randomUUID(),
        userId,
        ...deliverySnapshot,
        deliveryChannel: "EMAIL",
        scheduledFor: new Date("2026-10-05T17:59:00.000Z"),
      });
      const repository = new Repository();
      const [firstClaim] = await repository.claimDueDeliveries(
        firstClaimAt,
        1,
        3,
      );
      await repository.recoverStaleClaims(
        new Date("2026-10-05T18:10:00.000Z"),
        secondClaimAt,
      );
      const [secondClaim] = await repository.claimDueDeliveries(
        secondClaimAt,
        1,
        3,
      );

      const staleWrite = await repository.saveClaimResult(
        firstClaim.markSent("stale-worker-message"),
        firstClaimAt,
      );
      const currentWrite = await repository.saveClaimResult(
        secondClaim.markSent("current-worker-message"),
        secondClaimAt,
      );

      expect(staleWrite).toBe(false);
      expect(currentWrite).toBe(true);
    });

    it("checks enabled preferences, active books, and timezone day ranges", async () => {
      const bookId = crypto.randomUUID();
      await database.insert(reminderPreferences).values({
        userId,
        enabled: true,
        reminderTime: "00:00:00",
      });
      await database.insert(books).values({
        id: bookId,
        userId,
        title: "Concurrency in Practice",
        author: "Reader",
        totalPages: 100,
        status: "READING",
      });
      await database.insert(readingSessions).values({
        id: crypto.randomUUID(),
        userId,
        bookId,
        startPage: 0,
        endPage: 10,
        pagesRead: 10,
        readAt: new Date("2026-10-04T23:15:00.000Z"),
      });
      await database
        .update(users)
        .set({ timezone: "Africa/Lagos" })
        .where(eq(users.id, userId));
      const repository = new Repository();

      const eligibility = await repository.findEligibility(userId);
      const readDuringLagosDay = await repository.hasReadingSessionBetween(
        userId,
        new Date("2026-10-04T23:00:00.000Z"),
        new Date("2026-10-05T23:00:00.000Z"),
      );
      const readDuringUtcDay = await repository.hasReadingSessionBetween(
        userId,
        new Date("2026-10-05T00:00:00.000Z"),
        new Date("2026-10-06T00:00:00.000Z"),
      );

      expect(eligibility).toEqual({
        timezone: "Africa/Lagos",
        remindersEnabled: true,
        emailEnabled: true,
        hasActiveBook: true,
      });
      expect(readDuringLagosDay).toBe(true);
      expect(readDuringUtcDay).toBe(false);
    });

    it("assigns one immutable channel across concurrent workers", async () => {
      const deliveryId = crypto.randomUUID();
      const claimedAt = new Date("2026-10-05T18:05:00.000Z");
      await database.insert(reminderDeliveries).values({
        id: deliveryId,
        userId,
        ...deliverySnapshot,
        scheduledFor: new Date("2026-10-05T18:00:00.000Z"),
      });
      const repositoryA = new Repository();
      const repositoryB = new Repository();
      await repositoryA.claimDueDeliveries(claimedAt, 1, 3);

      const selections = await Promise.all([
        repositoryA.selectChannel(deliveryId, claimedAt, "PUSH", claimedAt),
        repositoryB.selectChannel(deliveryId, claimedAt, "EMAIL", claimedAt),
      ]);
      const [row] = await database
        .select({ channel: reminderDeliveries.deliveryChannel })
        .from(reminderDeliveries)
        .where(eq(reminderDeliveries.id, deliveryId));

      expect(selections.filter(Boolean)).toHaveLength(1);
      expect(["PUSH", "EMAIL"]).toContain(row.channel);
    });

    it("keeps an explicitly disabled existing preference disabled", async () => {
      await database.insert(reminderPreferences).values({
        userId,
        enabled: false,
      });

      const [preference] = await database
        .select({
          enabled: reminderPreferences.enabled,
          emailEnabled: reminderPreferences.emailEnabled,
        })
        .from(reminderPreferences)
        .where(eq(reminderPreferences.userId, userId));

      expect(preference).toEqual({ enabled: false, emailEnabled: true });
    });

    it("provisions new users with email reminders on and no push subscription", async () => {
      const clerkUserId = `clerk-${crypto.randomUUID()}`;
      const email = `${clerkUserId}@example.com`;
      const { provisionLocalUser } =
        await import("@/features/auth/infrastructure/drizzle-user-repository");
      const user = await provisionLocalUser({
        clerkUserId,
        email,
        name: "New Reader",
        image: null,
      });

      try {
        const [preference] = await database
          .select({
            enabled: reminderPreferences.enabled,
            emailEnabled: reminderPreferences.emailEnabled,
          })
          .from(reminderPreferences)
          .where(eq(reminderPreferences.userId, user.id));
        const subscriptions = await database
          .select({ id: pushSubscriptions.id })
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, user.id));

        expect(preference).toEqual({ enabled: true, emailEnabled: true });
        expect(subscriptions).toEqual([]);
      } finally {
        await database.delete(users).where(eq(users.id, user.id));
      }
    });

    it("lists active push subscriptions only for the reminder owner", async () => {
      const otherUserId = crypto.randomUUID();
      await database.insert(users).values({
        id: otherUserId,
        email: `other-${otherUserId}@example.com`,
      });
      await database.insert(pushSubscriptions).values([
        {
          userId,
          endpoint: "https://fcm.googleapis.com/fcm/send/user-a-active",
          p256dh: "p256dh_key_value_123",
          auth: "auth_key_value_123",
        },
        {
          userId,
          endpoint: "https://fcm.googleapis.com/fcm/send/user-a-revoked",
          p256dh: "p256dh_key_value_123",
          auth: "auth_key_value_123",
          revokedAt: new Date(),
        },
        {
          userId: otherUserId,
          endpoint: "https://fcm.googleapis.com/fcm/send/user-b-active",
          p256dh: "p256dh_key_value_123",
          auth: "auth_key_value_123",
        },
      ]);

      try {
        const { DrizzlePushSubscriptionRepository } =
          await import("@/features/push-notifications/infrastructure/drizzle-push-subscription-repository");
        const subscriptions =
          await new DrizzlePushSubscriptionRepository().listActiveForUser(
            userId,
          );

        expect(subscriptions).toHaveLength(1);
        expect(subscriptions[0].userId).toBe(userId);
        expect(subscriptions[0].endpoint).toContain("user-a-active");
      } finally {
        await database.delete(users).where(eq(users.id, otherUserId));
      }
    });
  },
);
