"use server";

import {
  RegisterPushSubscriptionUseCase,
  RevokePushSubscriptionUseCase,
  SendTestPushUseCase,
} from "@/features/push-notifications/application";
import {
  DrizzlePushSubscriptionRepository,
  WebPushNotificationService,
} from "@/features/push-notifications/infrastructure";
import { requireAuth } from "@/lib/auth/server";

function getUseCases() {
  const repository = new DrizzlePushSubscriptionRepository();
  return {
    register: new RegisterPushSubscriptionUseCase(repository),
    revoke: new RevokePushSubscriptionUseCase(repository),
    sendTest: new SendTestPushUseCase(
      repository,
      new WebPushNotificationService(),
    ),
  };
}

export async function registerPushSubscription(input: unknown) {
  const user = await requireAuth();
  return getUseCases().register.execute(user.id, input);
}

export async function revokePushSubscription(input: unknown) {
  const user = await requireAuth();
  return getUseCases().revoke.execute(user.id, input);
}

export async function sendTestPushNotification(input: unknown) {
  const user = await requireAuth();
  return getUseCases().sendTest.execute(user.id, input);
}
