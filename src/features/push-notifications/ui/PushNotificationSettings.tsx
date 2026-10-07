"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  registerPushSubscription,
  revokePushSubscription,
  sendTestPushNotification,
} from "@/features/push-notifications/ui/push-actions";
import {
  serializePushSubscription,
  subscriptionUsesVapidKey,
  supportsWebPush,
  vapidPublicKeyToBuffer,
} from "@/features/push-notifications/ui/push-browser";

type PushStatus =
  | "loading"
  | "unsupported"
  | "unavailable"
  | "not-enabled"
  | "enabled"
  | "blocked";

interface StatusMessage {
  kind: "success" | "error";
  text: string;
}

export function PushNotificationSettings({
  vapidPublicKey,
}: {
  vapidPublicKey: string;
}) {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [busyAction, setBusyAction] = useState<
    "enable" | "disable" | "test" | null
  >(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      if (!vapidPublicKey) {
        setStatus("unavailable");
        return;
      }
      if (!supportsWebPush()) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("blocked");
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setStatus("unavailable");
        return;
      }

      const currentSubscription =
        await registration.pushManager.getSubscription();
      if (cancelled) return;

      if (
        Notification.permission === "granted" &&
        currentSubscription &&
        subscriptionUsesVapidKey(currentSubscription, vapidPublicKey)
      ) {
        await registerPushSubscription(
          serializePushSubscription(currentSubscription),
        );
        if (!cancelled) {
          setSubscription(currentSubscription);
          setStatus("enabled");
        }
        return;
      }

      setStatus("not-enabled");
    };

    void loadStatus().catch(() => {
      if (!cancelled) {
        setStatus("not-enabled");
        setMessage({
          kind: "error",
          text: "Reading Buddy could not verify notification status.",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  const enableNotifications = async () => {
    setBusyAction("enable");
    setMessage(null);
    let createdSubscription: PushSubscription | null = null;

    try {
      if (!supportsWebPush()) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("blocked");
        return;
      }

      const existingRegistration =
        await navigator.serviceWorker.getRegistration();
      if (!existingRegistration) {
        throw new Error("Service worker is not available");
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "not-enabled");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let currentSubscription =
        await registration.pushManager.getSubscription();
      if (
        currentSubscription &&
        !subscriptionUsesVapidKey(currentSubscription, vapidPublicKey)
      ) {
        await currentSubscription.unsubscribe();
        currentSubscription = null;
      }
      if (!currentSubscription) {
        currentSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKeyToBuffer(vapidPublicKey),
        });
        createdSubscription = currentSubscription;
      }

      await registerPushSubscription(
        serializePushSubscription(currentSubscription),
      );
      setSubscription(currentSubscription);
      setStatus("enabled");
      setMessage({
        kind: "success",
        text: "Notifications are enabled on this device.",
      });
    } catch {
      if (createdSubscription) {
        await createdSubscription.unsubscribe().catch(() => false);
      }
      setMessage({
        kind: "error",
        text: "Reading Buddy could not enable notifications. Try again.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const disableNotifications = async () => {
    setBusyAction("disable");
    setMessage(null);

    let browserUnsubscribed = false;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const currentSubscription =
        subscription ?? (await registration?.pushManager.getSubscription());

      if (currentSubscription) {
        const endpoint = currentSubscription.endpoint;
        await currentSubscription.unsubscribe();
        browserUnsubscribed = true;
        await revokePushSubscription({ endpoint });
      }

      setSubscription(null);
      setStatus("not-enabled");
      setMessage({
        kind: "success",
        text: "Notifications are disabled on this device.",
      });
    } catch {
      if (browserUnsubscribed) {
        setSubscription(null);
        setStatus("not-enabled");
      }
      setMessage({
        kind: "error",
        text: browserUnsubscribed
          ? "Notifications are off in this browser. Server cleanup will finish automatically."
          : "Reading Buddy could not disable notifications. Try again.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const sendTest = async () => {
    if (!subscription) return;

    setBusyAction("test");
    setMessage(null);
    try {
      const result = await sendTestPushNotification({
        endpoint: subscription.endpoint,
      });
      if (result.status === "SENT") {
        setMessage({
          kind: "success",
          text: "Test notification sent to this device.",
        });
      } else if (result.status === "SUBSCRIPTION_EXPIRED") {
        setSubscription(null);
        setStatus("not-enabled");
        setMessage({
          kind: "error",
          text: "This browser subscription expired. Enable notifications again.",
        });
      } else {
        setMessage({
          kind: "error",
          text: "The test notification could not be sent.",
        });
      }
    } catch {
      setMessage({
        kind: "error",
        text: "The test notification could not be sent.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const statusText = {
    loading: "Checking notification status...",
    unsupported: "Web Push is not supported in this browser.",
    unavailable:
      "Notifications are unavailable. Open the production PWA and try again.",
    "not-enabled": "Notifications are not enabled on this device.",
    enabled: "Notifications are enabled on this device.",
    blocked: "Notifications are blocked in your browser settings.",
  }[status];

  return (
    <Card id="push-notifications" className="mx-auto w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BellRing className="text-primary size-5" aria-hidden="true" />
          <CardTitle className="text-foreground">Push Notifications</CardTitle>
        </div>
        <CardDescription>
          Enable notifications separately on each device. An active device makes
          push the preferred daily reminder channel; email remains the fallback
          when enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {statusText}
        </p>

        {status === "not-enabled" && (
          <Button
            type="button"
            className="w-full"
            disabled={busyAction !== null}
            onClick={enableNotifications}
          >
            {busyAction === "enable" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <BellRing className="size-4" aria-hidden="true" />
            )}
            Enable notifications
          </Button>
        )}

        {status === "enabled" && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="flex-1"
              disabled={busyAction !== null}
              onClick={sendTest}
            >
              {busyAction === "test" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              Send test notification
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busyAction !== null}
              onClick={disableNotifications}
            >
              {busyAction === "disable" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <BellOff className="size-4" aria-hidden="true" />
              )}
              Disable notifications
            </Button>
          </div>
        )}

        {message && (
          <p
            className={
              message.kind === "error"
                ? "text-destructive text-sm"
                : "text-accent-foreground text-sm"
            }
            role={message.kind === "error" ? "alert" : "status"}
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
