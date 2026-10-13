"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  LoaderCircle,
  SkipForward,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ReminderDeliveryView } from "../queries/delivery-history-query";

export interface DeliveryHistoryProps {
  deliveries: ReminderDeliveryView[];
  isLoading?: boolean;
}

function humanizeReason(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export function DeliveryHistory({
  deliveries,
  isLoading = false,
}: DeliveryHistoryProps) {
  if (isLoading) {
    return (
      <div className="border-border bg-card rounded-2xl border p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="text-primary size-7 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading reminder activity</span>
        </div>
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="border-border bg-card rounded-2xl border p-6">
        <p className="text-foreground font-medium">No reminder activity yet.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Sent and skipped reminders will appear here once the system has
          something useful to show.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card divide-border overflow-hidden rounded-2xl border divide-y">
      {deliveries.map((delivery) => {
        const scheduled = new Date(delivery.scheduledFor);
        const icon =
          delivery.status === "SENT" ? (
            <CheckCircle2 className="text-primary size-5" aria-hidden="true" />
          ) : delivery.status === "FAILED" ? (
            <AlertCircle className="text-destructive size-5" aria-hidden="true" />
          ) : delivery.status === "SKIPPED" ? (
            <SkipForward className="text-muted-foreground size-5" aria-hidden="true" />
          ) : delivery.status === "PROCESSING" ? (
            <LoaderCircle className="text-primary size-5" aria-hidden="true" />
          ) : (
            <Clock className="text-muted-foreground size-5" aria-hidden="true" />
          );

        const detail =
          delivery.status === "SKIPPED" && delivery.skipReason
            ? humanizeReason(delivery.skipReason)
            : delivery.status === "FAILED"
              ? delivery.attemptCount > 1
                ? `Delivery failed after ${delivery.attemptCount} attempts`
                : "Delivery failed"
              : delivery.status === "PROCESSING"
                ? "Sending now"
                : delivery.status === "PENDING"
                  ? "Waiting to send"
                  : delivery.sentAt
                    ? `Sent at ${new Date(delivery.sentAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`
                    : "Sent";

        return (
          <div key={delivery.id} className="flex items-start gap-4 p-4 sm:p-5">
            <div className="bg-muted grid size-10 shrink-0 place-items-center rounded-xl">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-foreground font-medium">
                  {scheduled.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  at{" "}
                  {scheduled.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {delivery.deliveryChannel && (
                  <Badge variant="outline">
                    {delivery.deliveryChannel.toLowerCase()}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-sm capitalize">
                {detail}
              </p>
              {delivery.nextAttemptAt && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Next retry{" "}
                  {new Date(delivery.nextAttemptAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
            <Badge
              variant={
                delivery.status === "FAILED"
                  ? "destructive"
                  : delivery.status === "SENT"
                    ? "default"
                    : "secondary"
              }
              className="shrink-0 capitalize"
            >
              {delivery.status.toLowerCase()}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
