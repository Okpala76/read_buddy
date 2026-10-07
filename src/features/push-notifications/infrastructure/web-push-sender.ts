import "server-only";

import * as webPush from "web-push";

import { config } from "@/config/env";
import type {
  PushNotificationSender,
  PushSendResult,
  StoredPushSubscription,
} from "@/features/push-notifications/application";
import type { PushNotificationPayload } from "@/features/push-notifications/domain/push-notification";

interface WebPushClient {
  sendNotification(
    subscription: webPush.PushSubscription,
    payload: string,
    options: webPush.RequestOptions,
  ): Promise<unknown>;
}

function errorStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return null;
  }

  return typeof error.statusCode === "number" ? error.statusCode : null;
}

export function classifyPushFailure(error: unknown): PushSendResult {
  const statusCode = errorStatusCode(error);
  if (statusCode === 404 || statusCode === 410) {
    return { status: "FAILED", reason: "SUBSCRIPTION_GONE" };
  }
  if (statusCode === 429 || (statusCode !== null && statusCode >= 500)) {
    return { status: "FAILED", reason: "TEMPORARY_FAILURE" };
  }
  if (statusCode === 401 || statusCode === 403) {
    return { status: "FAILED", reason: "CONFIGURATION_ERROR" };
  }
  if (statusCode !== null) {
    return { status: "FAILED", reason: "PROVIDER_ERROR" };
  }
  return { status: "FAILED", reason: "TEMPORARY_FAILURE" };
}

export class WebPushNotificationService implements PushNotificationSender {
  constructor(
    private readonly settings: {
      publicKey?: string;
      privateKey?: string;
      subject?: string;
      client?: WebPushClient;
    } = {},
  ) {}

  async send(
    subscription: StoredPushSubscription,
    payload: PushNotificationPayload,
  ): Promise<PushSendResult> {
    const publicKey =
      this.settings.publicKey ?? config.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = this.settings.privateKey ?? config.VAPID_PRIVATE_KEY;
    const subject = this.settings.subject ?? config.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      return { status: "FAILED", reason: "CONFIGURATION_ERROR" };
    }

    const serializedPayload = JSON.stringify(payload);
    if (Buffer.byteLength(serializedPayload, "utf8") > 3_993) {
      return { status: "FAILED", reason: "CONFIGURATION_ERROR" };
    }

    try {
      await (this.settings.client ?? webPush).sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        serializedPayload,
        {
          TTL: 300,
          urgency: "normal",
          timeout: 10_000,
          vapidDetails: { subject, publicKey, privateKey },
        },
      );
      return { status: "ACCEPTED" };
    } catch (error) {
      return classifyPushFailure(error);
    }
  }
}
