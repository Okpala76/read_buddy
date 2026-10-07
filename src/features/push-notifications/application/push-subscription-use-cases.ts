import { z } from "zod";

import {
  TEST_PUSH_NOTIFICATION,
  type PushNotificationPayload,
} from "@/features/push-notifications/domain/push-notification";

export function isSupportedPushServiceEndpoint(value: string): boolean {
  try {
    const { hostname, port, protocol } = new URL(value);
    return (
      protocol === "https:" &&
      (port === "" || port === "443") &&
      (hostname === "fcm.googleapis.com" ||
        hostname === "updates.push.services.mozilla.com" ||
        hostname === "web.push.apple.com" ||
        hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}

const endpointSchema = z
  .url()
  .max(2_048)
  .refine((value) => isSupportedPushServiceEndpoint(value), {
    message: "Push endpoint must use a supported HTTPS push service",
  });

const keySchema = z
  .string()
  .min(16)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+$/);

export const registerPushSubscriptionInputSchema = z
  .object({
    endpoint: endpointSchema,
    keys: z
      .object({
        p256dh: keySchema,
        auth: keySchema,
      })
      .strict(),
    userAgent: z.string().trim().min(1).max(512).nullable().optional(),
  })
  .strict();

export const pushEndpointInputSchema = z
  .object({ endpoint: endpointSchema })
  .strict();

export type RegisterPushSubscriptionInput = z.infer<
  typeof registerPushSubscriptionInputSchema
>;

export interface StoredPushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface PushSubscriptionRepository {
  upsertForUser(
    userId: string,
    input: RegisterPushSubscriptionInput,
    now: Date,
  ): Promise<void>;
  findActiveForUser(
    userId: string,
    endpoint: string,
  ): Promise<StoredPushSubscription | null>;
  listActiveForUser(userId: string): Promise<StoredPushSubscription[]>;
  revokeForUser(userId: string, endpoint: string, now: Date): Promise<boolean>;
  markUsedForUser(userId: string, endpoint: string, now: Date): Promise<void>;
}

export type PushSendResult =
  | { status: "ACCEPTED" }
  | {
      status: "FAILED";
      reason:
        | "SUBSCRIPTION_GONE"
        | "TEMPORARY_FAILURE"
        | "CONFIGURATION_ERROR"
        | "PROVIDER_ERROR";
    };

export interface PushNotificationSender {
  send(
    subscription: StoredPushSubscription,
    payload: PushNotificationPayload,
  ): Promise<PushSendResult>;
}

export class RegisterPushSubscriptionUseCase {
  constructor(private readonly repository: PushSubscriptionRepository) {}

  async execute(userId: string, input: unknown): Promise<{ enabled: true }> {
    const parsed = registerPushSubscriptionInputSchema.parse(input);
    await this.repository.upsertForUser(userId, parsed, new Date());
    return { enabled: true };
  }
}

export class RevokePushSubscriptionUseCase {
  constructor(private readonly repository: PushSubscriptionRepository) {}

  async execute(userId: string, input: unknown): Promise<{ revoked: boolean }> {
    const { endpoint } = pushEndpointInputSchema.parse(input);
    return {
      revoked: await this.repository.revokeForUser(
        userId,
        endpoint,
        new Date(),
      ),
    };
  }
}

export type TestPushResult =
  | { status: "SENT" }
  | { status: "NOT_FOUND" }
  | { status: "SUBSCRIPTION_EXPIRED" }
  | { status: "FAILED" };

export class SendTestPushUseCase {
  constructor(
    private readonly repository: PushSubscriptionRepository,
    private readonly sender: PushNotificationSender,
  ) {}

  async execute(userId: string, input: unknown): Promise<TestPushResult> {
    const { endpoint } = pushEndpointInputSchema.parse(input);
    const subscription = await this.repository.findActiveForUser(
      userId,
      endpoint,
    );

    if (!subscription) {
      return { status: "NOT_FOUND" };
    }

    const result = await this.sender.send(subscription, TEST_PUSH_NOTIFICATION);
    if (result.status === "ACCEPTED") {
      await this.repository.markUsedForUser(userId, endpoint, new Date());
      return { status: "SENT" };
    }

    if (result.reason === "SUBSCRIPTION_GONE") {
      await this.repository.revokeForUser(userId, endpoint, new Date());
      return { status: "SUBSCRIPTION_EXPIRED" };
    }

    return { status: "FAILED" };
  }
}
