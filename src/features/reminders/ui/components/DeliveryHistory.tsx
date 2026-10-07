"use client";

import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  LoaderCircle,
  SkipForward,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ReminderDelivery {
  id: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED";
  deliveryChannel: "EMAIL" | "PUSH" | null;
  scheduledFor: string;
  nextAttemptAt: string | null;
  sentAt: string | null;
  attemptCount: number;
  providerMessageId: string | null;
  errorCode: string | null;
  skipReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryHistoryProps {
  deliveries: ReminderDelivery[];
  isLoading?: boolean;
}

export function DeliveryHistory({
  deliveries,
  isLoading = false,
}: DeliveryHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" aria-hidden="true" />
            Delivery History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2
              className="text-primary h-8 w-8 animate-spin"
              aria-hidden="true"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: ReminderDelivery["status"]) => {
    switch (status) {
      case "SENT":
        return (
          <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
        );
      case "FAILED":
        return (
          <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
        );
      case "SKIPPED":
        return (
          <SkipForward className="h-4 w-4 text-gray-600" aria-hidden="true" />
        );
      case "PROCESSING":
        return (
          <LoaderCircle className="text-primary h-4 w-4" aria-hidden="true" />
        );
      case "PENDING":
      default:
        return <Clock className="h-4 w-4 text-yellow-600" aria-hidden="true" />;
    }
  };

  const getStatusBadge = (status: ReminderDelivery["status"]) => {
    const variants = {
      SENT: "default" as const,
      FAILED: "destructive" as const,
      SKIPPED: "secondary" as const,
      PROCESSING: "outline" as const,
      PENDING: "outline" as const,
    };
    return (
      <Badge variant={variants[status]} className="capitalize">
        {status.toLowerCase()}
      </Badge>
    );
  };

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" aria-hidden="true" />
            Delivery History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center">
            No delivery history yet. Enable reminders to see history here.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" aria-hidden="true" />
          Delivery History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left">
                <th className="pb-2 font-medium">Scheduled</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Channel</th>
                <th className="pb-2 font-medium">Attempts</th>
                <th className="pb-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr
                  key={delivery.id}
                  className="border-border/50 border-b last:border-0"
                >
                  <td className="py-3">
                    <div className="text-foreground font-medium">
                      {new Date(delivery.scheduledFor).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(delivery.scheduledFor).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    {delivery.deliveryChannel ? (
                      <Badge variant="outline">
                        {delivery.deliveryChannel.toLowerCase()}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(delivery.status)}
                      {getStatusBadge(delivery.status)}
                    </div>
                  </td>
                  <td className="text-muted-foreground py-3">
                    {delivery.attemptCount}
                  </td>
                  <td className="text-muted-foreground py-3">
                    {delivery.sentAt && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" aria-hidden="true" />
                        Sent:{" "}
                        {new Date(delivery.sentAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                    {delivery.errorCode && (
                      <div className="text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {delivery.errorCode}
                        {delivery.attemptCount > 1 && (
                          <span>(attempt {delivery.attemptCount})</span>
                        )}
                      </div>
                    )}
                    {delivery.nextAttemptAt && (
                      <div>
                        Retry:{" "}
                        {new Date(delivery.nextAttemptAt).toLocaleString()}
                      </div>
                    )}
                    {delivery.skipReason && (
                      <div className="text-muted-foreground">
                        {delivery.skipReason.replaceAll("_", " ").toLowerCase()}
                      </div>
                    )}
                    {delivery.providerMessageId && (
                      <div className="max-w-xs truncate font-mono text-xs">
                        ID: {delivery.providerMessageId}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
