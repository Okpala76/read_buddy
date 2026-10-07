import "server-only";

import type {
  ReminderPushSendResult,
  ReminderPushSender,
} from "@/features/reminders/application";
import { createReadingReminderPushNotification } from "@/features/push-notifications/domain/push-notification";
import type {
  PushNotificationSender,
  PushSubscriptionRepository,
} from "@/features/push-notifications/application";
import { DrizzlePushSubscriptionRepository } from "./drizzle-push-subscription-repository";
import { WebPushNotificationService } from "./web-push-sender";

export class ScheduledPushNotificationService implements ReminderPushSender {
  constructor(
    private readonly repository: PushSubscriptionRepository = new DrizzlePushSubscriptionRepository(),
    private readonly sender: PushNotificationSender = new WebPushNotificationService(),
  ) {}

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscriptions = await this.repository.listActiveForUser(userId);
    return subscriptions.length > 0;
  }

  async sendReminder(
    userId: string,
    deliveryId: string,
  ): Promise<ReminderPushSendResult> {
    const subscriptions = await this.repository.listActiveForUser(userId);
    if (subscriptions.length === 0) {
      return {
        status: "NO_ACTIVE_SUBSCRIPTIONS",
        attempted: 0,
        invalidated: 0,
      };
    }

    const payload = createReadingReminderPushNotification(deliveryId);
    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          return {
            subscription,
            result: await this.sender.send(subscription, payload),
          };
        } catch {
          return {
            subscription,
            result: {
              status: "FAILED" as const,
              reason: "TEMPORARY_FAILURE" as const,
            },
          };
        }
      }),
    );

    let accepted = 0;
    let invalidated = 0;
    let hasTemporaryFailure = false;
    let hasConfigurationFailure = false;

    await Promise.all(
      results.map(async ({ subscription, result }) => {
        if (result.status === "ACCEPTED") {
          accepted++;
          await this.repository
            .markUsedForUser(userId, subscription.endpoint, new Date())
            .catch(() => undefined);
          return;
        }
        if (result.reason === "SUBSCRIPTION_GONE") {
          invalidated++;
          await this.repository
            .revokeForUser(userId, subscription.endpoint, new Date())
            .catch(() => false);
          return;
        }
        if (result.reason === "TEMPORARY_FAILURE") {
          hasTemporaryFailure = true;
        } else if (result.reason === "CONFIGURATION_ERROR") {
          hasConfigurationFailure = true;
        }
      }),
    );

    const attempted = subscriptions.length;
    if (accepted > 0) {
      return {
        status: "ACCEPTED",
        providerMessageId: `web-push/${deliveryId}`,
        attempted,
        accepted,
        invalidated,
      };
    }
    if (invalidated === attempted) {
      return { status: "NO_ACTIVE_SUBSCRIPTIONS", attempted, invalidated };
    }
    if (hasTemporaryFailure) {
      return {
        status: "FAILED",
        classification: "RETRYABLE",
        errorCode: "PUSH_TEMPORARY_FAILURE",
        attempted,
        invalidated,
      };
    }
    return {
      status: "FAILED",
      classification: "PERMANENT",
      errorCode: hasConfigurationFailure
        ? "PUSH_CONFIGURATION_ERROR"
        : "PUSH_PROVIDER_ERROR",
      attempted,
      invalidated,
    };
  }
}
