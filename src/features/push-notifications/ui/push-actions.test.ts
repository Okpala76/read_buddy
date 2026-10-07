import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-a" }),
  repository: {
    upsertForUser: vi.fn().mockResolvedValue(undefined),
    findActiveForUser: vi.fn().mockResolvedValue(null),
    revokeForUser: vi.fn().mockResolvedValue(false),
    markUsedForUser: vi.fn().mockResolvedValue(undefined),
  },
  sender: {
    send: vi.fn().mockResolvedValue({ status: "ACCEPTED" }),
  },
}));

vi.mock("@/lib/auth/server", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/features/push-notifications/infrastructure", () => ({
  DrizzlePushSubscriptionRepository: vi.fn(function Repository() {
    return mocks.repository;
  }),
  WebPushNotificationService: vi.fn(function Sender() {
    return mocks.sender;
  }),
}));

import {
  registerPushSubscription,
  revokePushSubscription,
  sendTestPushNotification,
} from "./push-actions";

const input = {
  endpoint: "https://fcm.googleapis.com/fcm/send/device-a",
  keys: {
    p256dh: "p256dh_key_value_123",
    auth: "auth_key_value_123",
  },
  userAgent: "Test Browser",
};

describe("push notification Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ id: "user-a" });
    mocks.repository.findActiveForUser.mockResolvedValue(null);
    mocks.repository.revokeForUser.mockResolvedValue(false);
  });

  it("registers only for the authenticated internal user", async () => {
    await registerPushSubscription(input);

    expect(mocks.requireAuth).toHaveBeenCalledOnce();
    expect(mocks.repository.upsertForUser).toHaveBeenCalledWith(
      "user-a",
      input,
      expect.any(Date),
    );
  });

  it("rejects an arbitrary userId at the action boundary", async () => {
    await expect(
      registerPushSubscription({ ...input, userId: "user-b" }),
    ).rejects.toThrow();
    expect(mocks.repository.upsertForUser).not.toHaveBeenCalled();
  });

  it("scopes revoke and test-send lookups to the authenticated user", async () => {
    await revokePushSubscription({ endpoint: input.endpoint });
    const result = await sendTestPushNotification({ endpoint: input.endpoint });

    expect(mocks.repository.revokeForUser).toHaveBeenCalledWith(
      "user-a",
      input.endpoint,
      expect.any(Date),
    );
    expect(mocks.repository.findActiveForUser).toHaveBeenCalledWith(
      "user-a",
      input.endpoint,
    );
    expect(mocks.sender.send).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "NOT_FOUND" });
  });
});
