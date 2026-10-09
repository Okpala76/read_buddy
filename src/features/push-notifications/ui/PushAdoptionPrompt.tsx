"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supportsWebPush } from "@/features/push-notifications/ui/push-browser";

interface PushAdoptionPromptProps {
  enabled: boolean;
  emailEnabled: boolean;
}

export function PushAdoptionPrompt({
  enabled,
  emailEnabled,
}: PushAdoptionPromptProps) {
  const { userId } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId || !supportsWebPush() || Notification.permission === "denied") {
      return;
    }

    let cancelled = false;
    const storageKey = `read-buddy:push-prompt:v1:${userId}`;
    const inspect = async () => {
      if (window.localStorage.getItem(storageKey) === "dismissed") return;

      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (!cancelled && enabled && !subscription) {
        setVisible(true);
      }
    };

    void inspect().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  if (!visible || !userId) return null;

  const dismiss = () => {
    window.localStorage.setItem(
      `read-buddy:push-prompt:v1:${userId}`,
      "dismissed",
    );
    setVisible(false);
  };

  return (
    <aside className="border-primary/20 bg-primary/5 rounded-xl border p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div className="flex gap-3">
        <BellRing
          className="text-primary mt-0.5 size-5 shrink-0"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-foreground font-semibold">
            Want Reading Buddy to remind you on this device?
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            We will remind you each day if you have not logged reading.
            {emailEnabled
              ? " Email reminders are on by default, and you can change them anytime."
              : " Your email fallback is currently off."}
          </p>
        </div>
      </div>
      <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
        <Button asChild size="sm">
          <Link href="/reminders#push-notifications">Enable notifications</Link>
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </aside>
  );
}
