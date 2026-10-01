"use client";

import { useEffect, useState } from "react";
import { Bell, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReminderSettingsForm } from "./ReminderSettingsForm";
import { DeliveryHistory, type ReminderDelivery } from "./DeliveryHistory";

export function RemindersPage() {
  const [deliveries, setDeliveries] = useState<ReminderDelivery[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(true);

  useEffect(() => {
    const loadDeliveries = async () => {
      try {
        const response = await fetch("/api/reminders/deliveries");
        if (response.ok) {
          const data = await response.json();
          setDeliveries(data);
        }
      } catch (error) {
        console.error("Failed to load deliveries:", error);
      } finally {
        setIsLoadingDeliveries(false);
      }
    };
    loadDeliveries();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground flex items-center gap-2 text-2xl font-semibold">
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
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" aria-hidden="true" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <ReminderSettingsForm />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <DeliveryHistory
            deliveries={deliveries}
            isLoading={isLoadingDeliveries}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
