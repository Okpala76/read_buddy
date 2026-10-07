import { beforeEach, describe, expect, it, vi } from "vitest";

const serverOnlyMock = vi.hoisted(() => ({}));

vi.mock("server-only", () => serverOnlyMock);

vi.mock("@/config/env", () => ({
  config: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
    VAPID_PRIVATE_KEY: undefined,
    VAPID_SUBJECT: undefined,
  },
  env: {
    DATABASE_URL: "postgresql://dummy:dummy@localhost:5432/dummy",
    DATABASE_SSL: "require",
    DATABASE_POOL_MAX: 10,
    NODE_ENV: "test",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
    VAPID_PRIVATE_KEY: undefined,
    VAPID_SUBJECT: undefined,
  },
}));

import type {
  PushNotificationSender,
  PushSubscriptionRepository,
  StoredPushSubscription,
} from "@/features/push-notifications/application";
import { ScheduledPushNotificationService } from "./scheduled-push-sender";

function subscription(id: string, userId = "user-a"): StoredPushSubscription {
  return {
    id,
    userId,
    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
    p256dh: "p256dh_key_value_123",
    auth: "auth_key_value_123",
    userAgent: "Test Browser",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: null,
    revokedAt: null,
  };
}

describe("ScheduledPushNotificationService", () => {
  let repository: PushSubscriptionRepository;
  let sender: PushNotificationSender;

  beforeEach(() => {
    repository = {
      upsertForUser: vi.fn(),
      findActiveForUser: vi.fn(),
      listActiveForUser: vi.fn().mockResolvedValue([]),
      revokeForUser: vi.fn().mockResolvedValue(true),
      markUsedForUser: vi.fn().mockResolvedValue(undefined),
    };
    sender = { send: vi.fn() };
  });

  it("reports push unavailable without a provider attempt", async () => {
    const service = new ScheduledPushNotificationService(repository, sender);

    await expect(service.sendReminder("user-a", "delivery-1")).resolves.toEqual(
      { status: "NO_ACTIVE_SUBSCRIPTIONS", attempted: 0, invalidated: 0 },
    );
    expect(sender.send).not.toHaveBeenCalled();
  });

  it("fans one logical reminder out to every active user device", async () => {
    vi.mocked(repository.listActiveForUser).mockResolvedValue([
      subscription("phone"),
      subscription("desktop"),
    ]);
    vi.mocked(sender.send).mockResolvedValue({ status: "ACCEPTED" });
    const service = new ScheduledPushNotificationService(repository, sender);

    const result = await service.sendReminder("user-a", "delivery-1");

    expect(result).toEqual({
      status: "ACCEPTED",
      providerMessageId: "web-push/delivery-1",
      attempted: 2,
      accepted: 2,
      invalidated: 0,
    });
    expect(sender.send).toHaveBeenCalledTimes(2);
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-a" }),
      {
        title: "Time to read",
        body: "You haven't logged your reading today.",
        url: "/dashboard",
        tag: "reading-reminder-delivery-1",
      },
    );
  });

  it("succeeds once when one device accepts and another is gone", async () => {
    const phone = subscription("phone");
    const expired = subscription("expired");
    vi.mocked(repository.listActiveForUser).mockResolvedValue([phone, expired]);
    vi.mocked(sender.send)
      .mockResolvedValueOnce({ status: "ACCEPTED" })
      .mockResolvedValueOnce({
        status: "FAILED",
        reason: "SUBSCRIPTION_GONE",
      });
    const service = new ScheduledPushNotificationService(repository, sender);

    const result = await service.sendReminder("user-a", "delivery-1");

    expect(result.status).toBe("ACCEPTED");
    expect(repository.revokeForUser).toHaveBeenCalledWith(
      "user-a",
      expired.endpoint,
      expect.any(Date),
    );
  });

  it("does not fail or request email fallback after partial push acceptance", async () => {
    vi.mocked(repository.listActiveForUser).mockResolvedValue([
      subscription("phone"),
      subscription("desktop"),
    ]);
    vi.mocked(sender.send)
      .mockResolvedValueOnce({ status: "ACCEPTED" })
      .mockResolvedValueOnce({
        status: "FAILED",
        reason: "TEMPORARY_FAILURE",
      });
    const service = new ScheduledPushNotificationService(repository, sender);

    await expect(service.sendReminder("user-a", "delivery-1")).resolves.toEqual(
      expect.objectContaining({ status: "ACCEPTED", accepted: 1 }),
    );
  });

  it("revokes all expired devices and reports no active subscription", async () => {
    vi.mocked(repository.listActiveForUser).mockResolvedValue([
      subscription("phone"),
      subscription("desktop"),
    ]);
    vi.mocked(sender.send).mockResolvedValue({
      status: "FAILED",
      reason: "SUBSCRIPTION_GONE",
    });
    const service = new ScheduledPushNotificationService(repository, sender);

    await expect(service.sendReminder("user-a", "delivery-1")).resolves.toEqual(
      { status: "NO_ACTIVE_SUBSCRIPTIONS", attempted: 2, invalidated: 2 },
    );
    expect(repository.revokeForUser).toHaveBeenCalledTimes(2);
  });

  it("retains subscriptions and returns retryable failure on temporary errors", async () => {
    vi.mocked(repository.listActiveForUser).mockResolvedValue([
      subscription("phone"),
    ]);
    vi.mocked(sender.send).mockResolvedValue({
      status: "FAILED",
      reason: "TEMPORARY_FAILURE",
    });
    const service = new ScheduledPushNotificationService(repository, sender);

    await expect(service.sendReminder("user-a", "delivery-1")).resolves.toEqual(
      {
        status: "FAILED",
        classification: "RETRYABLE",
        errorCode: "PUSH_TEMPORARY_FAILURE",
        attempted: 1,
        invalidated: 0,
      },
    );
    expect(repository.revokeForUser).not.toHaveBeenCalled();
  });

  it("requests subscriptions only for the reminder owner", async () => {
    const service = new ScheduledPushNotificationService(repository, sender);

    await service.hasActiveSubscription("user-a");
    await service.sendReminder("user-a", "delivery-1");

    expect(repository.listActiveForUser).toHaveBeenNthCalledWith(1, "user-a");
    expect(repository.listActiveForUser).toHaveBeenNthCalledWith(2, "user-a");
  });
});
