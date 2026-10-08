import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

import { ReminderDelivery, ReminderPreference } from "../domain";

const databaseMocks = vi.hoisted(() => {
  const selectQuery = {} as Record<string, ReturnType<typeof vi.fn>>;
  selectQuery.from = vi.fn(() => selectQuery);
  selectQuery.innerJoin = vi.fn(() => selectQuery);
  selectQuery.leftJoin = vi.fn(() => selectQuery);
  selectQuery.where = vi.fn(() => selectQuery);
  selectQuery.orderBy = vi.fn(() => selectQuery);
  selectQuery.limit = vi.fn(() => selectQuery);
  selectQuery.offset = vi.fn().mockResolvedValue([]);

  const insertQuery = {} as Record<string, ReturnType<typeof vi.fn>>;
  insertQuery.values = vi.fn(() => insertQuery);
  insertQuery.onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  insertQuery.onConflictDoNothing = vi.fn(() => insertQuery);
  insertQuery.returning = vi.fn().mockResolvedValue([]);

  const updateQuery = {} as Record<string, ReturnType<typeof vi.fn>>;
  updateQuery.set = vi.fn(() => updateQuery);
  updateQuery.where = vi.fn(() => updateQuery);
  updateQuery.returning = vi.fn().mockResolvedValue([]);

  const transactionDatabase = {
    update: vi.fn(() => updateQuery),
    insert: vi.fn(() => insertQuery),
  };

  return {
    select: vi.fn(() => selectQuery),
    selectQuery,
    insert: vi.fn(() => insertQuery),
    insertQuery,
    transaction: vi.fn(
      async (callback: (database: typeof transactionDatabase) => unknown) =>
        callback(transactionDatabase),
    ),
    transactionDatabase,
    updateQuery,
  };
});

vi.mock("@/db/client", () => ({
  db: {
    select: databaseMocks.select,
    insert: databaseMocks.insert,
    update: vi.fn(() => databaseMocks.updateQuery),
    transaction: databaseMocks.transaction,
  },
}));

import {
  DrizzleReminderDeliveryRepository,
  DrizzleReminderDispatchRepository,
  DrizzleReminderPreferenceRepository,
  DrizzleReminderSchedulingRepository,
} from "./drizzle-reminder-repository";

describe("DrizzleReminderDeliveryRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseMocks.selectQuery.offset.mockResolvedValue([]);
    databaseMocks.insertQuery.onConflictDoUpdate.mockResolvedValue(undefined);
    databaseMocks.insertQuery.returning.mockResolvedValue([]);
  });

  it("scopes status-filtered history by user and preserves pagination order", async () => {
    const repository = new DrizzleReminderDeliveryRepository();

    await repository.findByUserIdAndStatus("user-a", "SENT", 10, 5);

    const condition = databaseMocks.selectQuery.where.mock.calls[0][0];
    const whereQuery = new PgDialect().sqlToQuery(condition);
    const orderQuery = new PgDialect().sqlToQuery(
      databaseMocks.selectQuery.orderBy.mock.calls[0][0],
    );

    expect(whereQuery.sql).toBe(
      '("reminder_deliveries"."user_id" = $1 and "reminder_deliveries"."status" = $2)',
    );
    expect(whereQuery.params).toEqual(["user-a", "SENT"]);
    expect(orderQuery.sql).toBe('"reminder_deliveries"."scheduled_for" desc');
    expect(databaseMocks.selectQuery.limit).toHaveBeenCalledWith(10);
    expect(databaseMocks.selectQuery.offset).toHaveBeenCalledWith(5);
  });

  it("scopes unfiltered history by user", async () => {
    const repository = new DrizzleReminderDeliveryRepository();

    await repository.findByUserId("user-a", 25, 0);

    const condition = databaseMocks.selectQuery.where.mock.calls[0][0];
    const whereQuery = new PgDialect().sqlToQuery(condition);

    expect(whereQuery.sql).toBe('"reminder_deliveries"."user_id" = $1');
    expect(whereQuery.params).toEqual(["user-a"]);
    expect(databaseMocks.selectQuery.limit).toHaveBeenCalledWith(25);
    expect(databaseMocks.selectQuery.offset).toHaveBeenCalledWith(0);
  });
});

describe("DrizzleReminderDispatchRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseMocks.updateQuery.returning.mockResolvedValue([
      { id: "delivery-a" },
    ]);
  });

  it("selects a channel only for the active claim while it is unset", async () => {
    const repository = new DrizzleReminderDispatchRepository();
    const claimedAt = new Date("2026-10-05T18:00:00.000Z");

    await repository.selectChannel("delivery-a", claimedAt, "PUSH", claimedAt);

    const condition = databaseMocks.updateQuery.where.mock.calls[0][0];
    const query = new PgDialect().sqlToQuery(condition);
    expect(query.params).toEqual([
      "delivery-a",
      "PROCESSING",
      claimedAt.toISOString(),
    ]);
    expect(query.sql).toContain('"delivery_channel" is null');
  });

  it("allows fallback only from an unattempted PUSH claim", async () => {
    const repository = new DrizzleReminderDispatchRepository();
    const claimedAt = new Date("2026-10-05T18:00:00.000Z");

    await repository.fallbackToEmail("delivery-a", claimedAt, claimedAt);

    const condition = databaseMocks.updateQuery.where.mock.calls[0][0];
    const query = new PgDialect().sqlToQuery(condition);
    expect(query.params).toEqual([
      "delivery-a",
      "PROCESSING",
      claimedAt.toISOString(),
      "PUSH",
      0,
    ]);
  });
});

describe("DrizzleReminderPreferenceRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseMocks.updateQuery.where.mockResolvedValue(undefined);
    databaseMocks.insertQuery.onConflictDoUpdate.mockResolvedValue(undefined);
  });

  it("saves the preference and user timezone in one transaction", async () => {
    const repository = new DrizzleReminderPreferenceRepository();
    const preference = ReminderPreference.create({
      userId: "user-a",
      enabled: true,
      reminderTime: "19:00:00",
    });

    await repository.saveSettings(preference, "Africa/Lagos");

    expect(databaseMocks.transaction).toHaveBeenCalledOnce();
    expect(databaseMocks.updateQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: "Africa/Lagos" }),
    );
    expect(databaseMocks.insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        enabled: true,
        emailEnabled: true,
        reminderTime: "19:00:00",
      }),
    );
  });
});

describe("DrizzleReminderSchedulingRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseMocks.selectQuery.where.mockImplementation(
      () => databaseMocks.selectQuery,
    );
    databaseMocks.insertQuery.returning.mockResolvedValue([]);
  });

  it("queries only enabled preferences joined to user timezones", async () => {
    const candidates = [
      {
        userId: "user-a",
        recipientEmail: "reader@example.com",
        bookTitle: "Repository Patterns",
        bookCurrentPage: 25,
        bookTotalPages: 100,
        dailyPageTarget: 10,
        reminderTime: "19:00:00",
        timezone: "Africa/Lagos",
        enabled: true,
      },
    ];
    databaseMocks.selectQuery.where.mockResolvedValueOnce(candidates);
    const repository = new DrizzleReminderSchedulingRepository();

    const result = await repository.findEnabledCandidates();

    const condition = databaseMocks.selectQuery.where.mock.calls[0][0];
    const whereQuery = new PgDialect().sqlToQuery(condition);
    expect(result).toEqual(candidates);
    expect(databaseMocks.selectQuery.innerJoin).toHaveBeenCalledOnce();
    expect(whereQuery.sql).toBe('"reminder_preferences"."enabled" = $1');
    expect(whereQuery.params).toEqual([true]);
  });

  it("uses the user, scheduled instant, and kind for atomic creation", async () => {
    const repository = new DrizzleReminderSchedulingRepository();
    const delivery = ReminderDelivery.create({
      id: "delivery-a",
      userId: "user-a",
      recipientEmail: "reader@example.com",
      bookTitle: "Repository Patterns",
      bookCurrentPage: 25,
      bookTotalPages: 100,
      dailyPageTarget: 10,
      scheduledFor: new Date("2026-10-05T18:00:00.000Z"),
    });
    databaseMocks.insertQuery.returning
      .mockResolvedValueOnce([{ id: "delivery-a" }])
      .mockResolvedValueOnce([]);

    const first = await repository.createDeliveryIfAbsent(delivery);
    const duplicate = await repository.createDeliveryIfAbsent(delivery);

    expect(first).toBe(true);
    expect(duplicate).toBe(false);
    expect(databaseMocks.insertQuery.onConflictDoNothing).toHaveBeenCalledWith({
      target: expect.arrayContaining([
        expect.objectContaining({ name: "user_id" }),
        expect.objectContaining({ name: "scheduled_for" }),
        expect.objectContaining({ name: "notification_kind" }),
      ]),
    });
  });
});
