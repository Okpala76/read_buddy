import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const databaseMocks = vi.hoisted(() => {
  const insertQuery = {} as Record<string, ReturnType<typeof vi.fn>>;
  insertQuery.values = vi.fn(() => insertQuery);
  insertQuery.onConflictDoUpdate = vi.fn(() => insertQuery);
  insertQuery.returning = vi.fn().mockResolvedValue([{ id: "subscription-1" }]);

  const selectQuery = {} as Record<string, ReturnType<typeof vi.fn>>;
  selectQuery.from = vi.fn(() => selectQuery);
  selectQuery.where = vi.fn(() => selectQuery);
  selectQuery.limit = vi.fn().mockResolvedValue([]);

  const updateQuery = {} as Record<string, ReturnType<typeof vi.fn>>;
  updateQuery.set = vi.fn(() => updateQuery);
  updateQuery.where = vi.fn(() => updateQuery);
  updateQuery.returning = vi.fn().mockResolvedValue([]);

  return {
    insert: vi.fn(() => insertQuery),
    insertQuery,
    select: vi.fn(() => selectQuery),
    selectQuery,
    update: vi.fn(() => updateQuery),
    updateQuery,
  };
});

vi.mock("@/db/client", () => ({
  db: {
    insert: databaseMocks.insert,
    select: databaseMocks.select,
    update: databaseMocks.update,
  },
}));

import { pushSubscriptions } from "@/db/schema";
import { DrizzlePushSubscriptionRepository } from "./drizzle-push-subscription-repository";

describe("DrizzlePushSubscriptionRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseMocks.insertQuery.onConflictDoUpdate.mockImplementation(
      () => databaseMocks.insertQuery,
    );
    databaseMocks.insertQuery.returning.mockResolvedValue([
      { id: "subscription-1" },
    ]);
    databaseMocks.selectQuery.limit.mockResolvedValue([]);
    databaseMocks.updateQuery.returning.mockResolvedValue([]);
  });

  it("atomically upserts on endpoint and reassigns ownership", async () => {
    const repository = new DrizzlePushSubscriptionRepository();
    const now = new Date("2026-10-07T12:00:00.000Z");

    await repository.upsertForUser(
      "user-b",
      {
        endpoint: "https://push.example/shared-device",
        keys: {
          p256dh: "p256dh_key_value_123",
          auth: "auth_key_value_123",
        },
        userAgent: "Shared Browser",
      },
      now,
    );

    expect(databaseMocks.insertQuery.onConflictDoUpdate).toHaveBeenCalledWith({
      target: pushSubscriptions.endpoint,
      setWhere: expect.anything(),
      set: expect.objectContaining({
        userId: "user-b",
        revokedAt: null,
        updatedAt: now,
        lastUsedAt: now,
      }),
    });

    const conflict =
      databaseMocks.insertQuery.onConflictDoUpdate.mock.calls[0][0];
    const ownershipCondition = new PgDialect().sqlToQuery(conflict.setWhere);
    expect(ownershipCondition.params).toEqual([
      "user-b",
      "p256dh_key_value_123",
      "auth_key_value_123",
    ]);
  });

  it("rejects an endpoint conflict when ownership cannot be verified", async () => {
    databaseMocks.insertQuery.returning.mockResolvedValue([]);
    const repository = new DrizzlePushSubscriptionRepository();

    await expect(
      repository.upsertForUser(
        "user-b",
        {
          endpoint: "https://push.example/shared-device",
          keys: {
            p256dh: "p256dh_key_value_123",
            auth: "auth_key_value_123",
          },
          userAgent: null,
        },
        new Date(),
      ),
    ).rejects.toThrow(/ownership/);
  });

  it("scopes active lookup by user, endpoint, and revocation", async () => {
    const repository = new DrizzlePushSubscriptionRepository();

    await repository.findActiveForUser(
      "user-a",
      "https://push.example/device-a",
    );

    const where = databaseMocks.selectQuery.where.mock.calls[0][0];
    const query = new PgDialect().sqlToQuery(where);
    expect(query.sql).toBe(
      '("push_subscriptions"."user_id" = $1 and "push_subscriptions"."endpoint" = $2 and "push_subscriptions"."revoked_at" is null)',
    );
    expect(query.params).toEqual(["user-a", "https://push.example/device-a"]);
  });

  it("lists only active subscriptions for the requested user", async () => {
    const repository = new DrizzlePushSubscriptionRepository();

    await repository.listActiveForUser("user-a");

    const where = databaseMocks.selectQuery.where.mock.calls[0][0];
    const query = new PgDialect().sqlToQuery(where);
    expect(query.params).toEqual(["user-a"]);
    expect(query.sql).toContain('"push_subscriptions"."revoked_at" is null');
  });

  it("scopes revocation by authenticated user and endpoint", async () => {
    const repository = new DrizzlePushSubscriptionRepository();

    await repository.revokeForUser(
      "user-a",
      "https://push.example/device-a",
      new Date(),
    );

    const where = databaseMocks.updateQuery.where.mock.calls[0][0];
    const query = new PgDialect().sqlToQuery(where);
    expect(query.params).toEqual(["user-a", "https://push.example/device-a"]);
  });
});
