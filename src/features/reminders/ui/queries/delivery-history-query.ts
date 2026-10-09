import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

export const reminderDeliverySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["PENDING", "PROCESSING", "SENT", "FAILED", "SKIPPED"]),
  deliveryChannel: z.enum(["EMAIL", "PUSH"]).nullable(),
  scheduledFor: z.string(),
  nextAttemptAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  attemptCount: z.number().int().nonnegative(),
  providerMessageId: z.string().nullable(),
  errorCode: z.string().nullable(),
  skipReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const reminderDeliveriesSchema = z.array(reminderDeliverySchema);

export type ReminderDeliveryView = z.infer<typeof reminderDeliverySchema>;

export const reminderQueryKeys = {
  all: ["reminders"] as const,
  deliveries: () => ["reminders", "deliveries"] as const,
};

async function fetchReminderDeliveries() {
  const response = await fetch("/api/reminders/deliveries");
  if (!response.ok) {
    throw new Error("Failed to load reminder delivery history");
  }

  return reminderDeliveriesSchema.parse(await response.json());
}

export function reminderDeliveriesQueryOptions() {
  return queryOptions({
    queryKey: reminderQueryKeys.deliveries(),
    queryFn: fetchReminderDeliveries,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) =>
      query.state.data?.some(
        (delivery) =>
          delivery.status === "PENDING" || delivery.status === "PROCESSING",
      )
        ? 15_000
        : false,
  });
}
