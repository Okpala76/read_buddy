"use client";

import { useAuth } from "@clerk/nextjs";
import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePwaInstall } from "@/features/pwa/ui/PwaInstallProvider";
import {
  subscriptionUsesVapidKey,
  supportsWebPush,
} from "@/features/push-notifications/ui/push-browser";
import { PushNotificationSettings } from "@/features/push-notifications/ui/PushNotificationSettings";

const INTRO_KEY_PREFIX = "read-buddy:installed-push-intro:v1:";

function wasDismissed(userId: string): boolean {
  try {
    return (
      window.localStorage.getItem(INTRO_KEY_PREFIX + userId) === "dismissed"
    );
  } catch {
    return false;
  }
}

export function InstalledPushActivation({
  vapidPublicKey,
}: {
  vapidPublicKey: string;
}) {
  const { userId } = useAuth();
  const { installed, ready, platform } = usePwaInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (
      !ready ||
      !installed ||
      !userId ||
      !vapidPublicKey ||
      platform === "desktop" ||
      !supportsWebPush() ||
      Notification.permission === "denied" ||
      wasDismissed(userId)
    ) {
      return;
    }

    let cancelled = false;

    const checkSubscription = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      const alreadyEnabled =
        Notification.permission === "granted" &&
        subscription !== null &&
        subscriptionUsesVapidKey(subscription, vapidPublicKey);

      if (!cancelled && !alreadyEnabled) {
        setOpen(true);
      }
    };

    void checkSubscription().catch(() => {
      // The regular Reminders page remains available for setup or recovery.
    });

    return () => {
      cancelled = true;
    };
  }, [ready, installed, userId, vapidPublicKey, platform]);

  const close = () => {
    setOpen(false);
    if (!userId) return;
    try {
      window.localStorage.setItem(INTRO_KEY_PREFIX + userId, "dismissed");
    } catch {
      // This session remains dismissed even when storage is unavailable.
    }
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-0 sm:w-[32rem] sm:rounded-t-2xl"
      >
        <SheetHeader className="text-left">
          <span className="bg-primary/10 text-primary mb-2 inline-flex size-11 items-center justify-center rounded-xl">
            <BellRing className="size-6" aria-hidden="true" />
          </span>
          <SheetTitle>Get your reading reminders</SheetTitle>
          <SheetDescription>
            Reading Buddy is now on your Home Screen. Turn on notifications to
            get reminders even when the app is closed.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5">
          <PushNotificationSettings vapidPublicKey={vapidPublicKey} />
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-4 min-h-11 w-full"
          onClick={close}
        >
          Not now / Done
        </Button>
      </SheetContent>
    </Sheet>
  );
}
