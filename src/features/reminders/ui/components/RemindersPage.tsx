"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Bell, ChevronDown, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReminderSettingsForm } from "./ReminderSettingsForm";
import { DeliveryHistoryQuery } from "./DeliveryHistoryQuery";
import { ReminderQueryProvider } from "./ReminderQueryProvider";
import { reminderDeliveriesQueryOptions } from "../queries/delivery-history-query";
import type { ReminderSettingsView } from "./ReminderSettingsForm";

const PushNotificationSettings = dynamic(() =>
  import("@/features/push-notifications/ui/PushNotificationSettings").then(
    (module) => module.PushNotificationSettings,
  ),
);

export function RemindersPage({
  vapidPublicKey,
  initialSettings,
}: {
  vapidPublicKey: string;
  initialSettings: ReminderSettingsView;
}) {
  return (
    <ReminderQueryProvider>
      <RemindersPageContent
        vapidPublicKey={vapidPublicKey}
        initialSettings={initialSettings}
      />
    </ReminderQueryProvider>
  );
}

function RemindersPageContent({
  vapidPublicKey,
  initialSettings,
}: {
  vapidPublicKey: string;
  initialSettings: ReminderSettingsView;
}) {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);

  const prefetchHistory = () => {
    void queryClient.prefetchQuery(reminderDeliveriesQueryOptions());
  };

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <p className="text-primary text-sm font-medium">Reminders</p>
        <h1 className="text-foreground mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Build a reminder that fits your reading day.
        </h1>
        <p className="text-muted-foreground mt-2">
          Choose when you want a nudge. Reading Buddy will use push when this
          device is connected, then fall back to email if you keep email
          reminders enabled.
        </p>
      </header>

      <div className="max-w-3xl space-y-6">
        <ReminderSettingsForm initialPreference={initialSettings} />
        <PushNotificationSettings vapidPublicKey={vapidPublicKey} />
      </div>

      <section className="border-border max-w-3xl border-t pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="text-muted-foreground size-4" aria-hidden="true" />
              <h2 className="text-foreground font-semibold">Reminder activity</h2>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Useful when you want to confirm that a reminder was sent or
              understand why one was skipped.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 motion-press"
            onPointerEnter={prefetchHistory}
            onFocus={prefetchHistory}
            onClick={() => {
              if (!showHistory) prefetchHistory();
              setShowHistory((value) => !value);
            }}
            aria-expanded={showHistory}
          >
            <Bell className="size-4" aria-hidden="true" />
            {showHistory ? "Hide activity" : "View activity"}
            <ChevronDown
              className={`size-4 transition-transform ${showHistory ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </div>

        {showHistory && (
          <div className="mt-5 motion-disclosure-in">
            <DeliveryHistoryQuery />
          </div>
        )}
      </section>
    </div>
  );
}
