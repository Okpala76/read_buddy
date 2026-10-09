"use client";

import { useQuery } from "@tanstack/react-query";

import { DeliveryHistory } from "./DeliveryHistory";
import { reminderDeliveriesQueryOptions } from "../queries/delivery-history-query";

export function DeliveryHistoryQuery() {
  const deliveries = useQuery(reminderDeliveriesQueryOptions());

  if (deliveries.isError) {
    return (
      <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-6 text-center">
        <p className="text-destructive">Could not load delivery history.</p>
        <button
          type="button"
          className="text-primary mt-3 text-sm font-medium underline-offset-4 hover:underline"
          onClick={() => void deliveries.refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <DeliveryHistory
      deliveries={deliveries.data ?? []}
      isLoading={deliveries.isPending}
    />
  );
}
