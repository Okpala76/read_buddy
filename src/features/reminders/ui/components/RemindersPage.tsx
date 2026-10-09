"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Bell, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const prefetchHistory = () => {
    void queryClient.prefetchQuery(reminderDeliveriesQueryOptions());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Bell className="text-primary h-6 w-6" aria-hidden="true" />
            Reminders
          </h1>
          <p className="text-muted-foreground">
            Configure daily reading reminders and view delivery history
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
            Settings
          </TabsTrigger>
          <TabsTrigger
            value="history"
            onPointerEnter={prefetchHistory}
            onFocus={prefetchHistory}
          >
            <History className="mr-2 h-4 w-4" aria-hidden="true" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <div className="space-y-4">
            <ReminderSettingsForm initialPreference={initialSettings} />
            <PushNotificationSettings vapidPublicKey={vapidPublicKey} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <DeliveryHistoryQuery />
        </TabsContent>
      </Tabs>
    </div>
  );
}
