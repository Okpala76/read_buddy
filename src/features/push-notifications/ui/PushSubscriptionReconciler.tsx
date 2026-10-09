"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

import { registerPushSubscription } from "@/features/push-notifications/ui/push-actions";
import {
  serializePushSubscription,
  subscriptionUsesVapidKey,
  supportsWebPush,
} from "@/features/push-notifications/ui/push-browser";

export function PushSubscriptionReconciler({
  vapidPublicKey,
}: {
  vapidPublicKey: string;
}) {
  const { sessionId, userId } = useAuth();

  useEffect(() => {
    if (
      !userId ||
      !vapidPublicKey ||
      !supportsWebPush() ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const reconcile = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (
        subscription &&
        subscriptionUsesVapidKey(subscription, vapidPublicKey)
      ) {
        await registerPushSubscription(serializePushSubscription(subscription));
      }
    };

    const run = (allowRetry: boolean) => {
      void reconcile().catch(() => {
        if (!cancelled && allowRetry) {
          retry = setTimeout(() => run(false), 2_000);
        }
      });
    };
    const initialRun = setTimeout(() => run(true), 1_500);

    return () => {
      cancelled = true;
      clearTimeout(initialRun);
      if (retry) clearTimeout(retry);
    };
  }, [sessionId, userId, vapidPublicKey]);

  return null;
}
