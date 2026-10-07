import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredPushSubscription } from "@/features/push-notifications/application";
import { TEST_PUSH_NOTIFICATION } from "@/features/push-notifications/domain/push-notification";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({
  config: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
    VAPID_PRIVATE_KEY: undefined,
    VAPID_SUBJECT: undefined,
  },
}));

import {
  classifyPushFailure,
  WebPushNotificationService,
} from "./web-push-sender";

const subscription: StoredPushSubscription = {
  id: "subscription-a",
  userId: "user-a",
  endpoint: "https://push.example/device-a",
  p256dh: "p256dh_key_value_123",
  auth: "auth_key_value_123",
  userAgent: "Test Browser",
  createdAt: new Date("2026-10-07T00:00:00.000Z"),
  updatedAt: new Date("2026-10-07T00:00:00.000Z"),
  lastUsedAt: null,
  revokedAt: null,
};

describe("WebPushNotificationService", () => {
  const sendNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sendNotification.mockResolvedValue({ statusCode: 201 });
  });

  it("sends a standards-based payload without exposing storage metadata", async () => {
    const service = new WebPushNotificationService({
      publicKey: "public_key",
      privateKey: "private_key",
      subject: "mailto:reminders@read-buddy.ogalandlord.com.ng",
      client: { sendNotification },
    });

    await expect(
      service.send(subscription, TEST_PUSH_NOTIFICATION),
    ).resolves.toEqual({ status: "ACCEPTED" });
    expect(sendNotification).toHaveBeenCalledWith(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(TEST_PUSH_NOTIFICATION),
      expect.objectContaining({
        TTL: 300,
        timeout: 10_000,
        urgency: "normal",
        vapidDetails: {
          subject: "mailto:reminders@read-buddy.ogalandlord.com.ng",
          publicKey: "public_key",
          privateKey: "private_key",
        },
      }),
    );
  });

  it("returns a controlled error when VAPID is unconfigured", async () => {
    const service = new WebPushNotificationService({
      client: { sendNotification },
    });

    await expect(
      service.send(subscription, TEST_PUSH_NOTIFICATION),
    ).resolves.toEqual({ status: "FAILED", reason: "CONFIGURATION_ERROR" });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it.each([404, 410])(
    "classifies HTTP %s as a gone subscription",
    (statusCode) => {
      expect(classifyPushFailure({ statusCode })).toEqual({
        status: "FAILED",
        reason: "SUBSCRIPTION_GONE",
      });
    },
  );

  it.each([429, 500, 503])("classifies HTTP %s as temporary", (statusCode) => {
    expect(classifyPushFailure({ statusCode })).toEqual({
      status: "FAILED",
      reason: "TEMPORARY_FAILURE",
    });
  });

  it("does not expose provider details from an unexpected network error", () => {
    expect(classifyPushFailure(new Error("contains sensitive detail"))).toEqual(
      {
        status: "FAILED",
        reason: "TEMPORARY_FAILURE",
      },
    );
  });
});
