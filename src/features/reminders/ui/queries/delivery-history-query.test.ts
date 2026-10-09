import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { reminderDeliveriesQueryOptions } from "./delivery-history-query";

const delivery = {
  id: "3c4cf444-86df-4b5d-b737-263377fc167b",
  status: "PENDING",
  deliveryChannel: "EMAIL",
  scheduledFor: "2026-10-10T19:00:00.000Z",
  nextAttemptAt: null,
  sentAt: null,
  attemptCount: 0,
  providerMessageId: null,
  errorCode: null,
  skipReason: null,
  createdAt: "2026-10-10T18:55:00.000Z",
  updatedAt: "2026-10-10T18:55:00.000Z",
};

describe("reminder delivery query", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses delivery history returned by the authenticated endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([delivery]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await expect(
      queryClient.fetchQuery(reminderDeliveriesQueryOptions()),
    ).resolves.toEqual([delivery]);
  });

  it("rejects malformed private data instead of caching it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ ...delivery, status: "UNKNOWN" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await expect(
      queryClient.fetchQuery(reminderDeliveriesQueryOptions()),
    ).rejects.toThrow();
  });
});
