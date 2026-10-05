import { describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({
  config: {
    RESEND_API_KEY: undefined,
    RESEND_FROM_EMAIL: undefined,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

import type { ReminderEmailInput } from "../application";
import {
  buildReminderEmail,
  classifyEmailFailure,
  ResendEmailService,
} from "./resend-email";

const input: ReminderEmailInput = {
  deliveryId: "4b8c0000-0000-4000-8000-000000000001",
  recipientEmail: "reader@example.com",
  bookTitle: "A <Useful> Book",
  bookCurrentPage: 42,
  bookTotalPages: 210,
  dailyPageTarget: 15,
  scheduledFor: new Date("2026-10-05T18:00:00.000Z"),
};

function createClient(response: unknown) {
  return {
    emails: {
      send: vi.fn().mockResolvedValue(response),
    },
  };
}

describe("ResendEmailService", () => {
  it("sends deterministic HTML and text with the configured envelope", async () => {
    const client = createClient({
      data: { id: "resend-email-1" },
      error: null,
      headers: {},
    });
    const service = new ResendEmailService({
      apiKey: "test-key",
      fromEmail: "Reading Buddy <reminders@example.com>",
      appUrl: "https://read.example.com",
      client,
    });

    const result = await service.sendReminder(input);

    expect(result).toEqual({
      status: "ACCEPTED",
      providerMessageId: "resend-email-1",
    });
    expect(client.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Reading Buddy <reminders@example.com>",
        to: "reader@example.com",
        subject: "Time to read: A <Useful> Book",
        html: expect.stringContaining("A &lt;Useful&gt; Book"),
        text: expect.stringContaining("A <Useful> Book"),
      }),
      {
        idempotencyKey: "reading-reminder/4b8c0000-0000-4000-8000-000000000001",
      },
    );
  });

  it("reuses the exact request when provider acceptance was not persisted", async () => {
    const client = createClient({
      data: { id: "resend-email-1" },
      error: null,
      headers: {},
    });
    const service = new ResendEmailService({
      apiKey: "test-key",
      fromEmail: "Reading Buddy <reminders@example.com>",
      appUrl: "https://read.example.com",
      client,
    });

    await service.sendReminder(input);
    await service.sendReminder(input);

    expect(client.emails.send).toHaveBeenCalledTimes(2);
    expect(client.emails.send.mock.calls[1]).toEqual(
      client.emails.send.mock.calls[0],
    );
  });

  it("returns a controlled permanent failure when provider config is missing", async () => {
    const service = new ResendEmailService({ apiKey: "", fromEmail: "" });

    await expect(service.sendReminder(input)).resolves.toEqual({
      status: "FAILED",
      classification: "PERMANENT",
      errorCode: "PROVIDER_CONFIG_ERROR",
    });
  });

  it("returns only a sanitized provider failure", async () => {
    const client = createClient({
      data: null,
      error: {
        name: "restricted_api_key",
        statusCode: 401,
        message: "secret diagnostic from provider",
      },
      headers: {},
    });
    const service = new ResendEmailService({
      apiKey: "test-key",
      fromEmail: "reminders@example.com",
      client,
    });

    const result = await service.sendReminder(input);

    expect(result).toEqual({
      status: "FAILED",
      classification: "PERMANENT",
      errorCode: "PROVIDER_AUTH_ERROR",
    });
    expect(JSON.stringify(result)).not.toContain("secret diagnostic");
  });
});

describe("buildReminderEmail", () => {
  it("renders stable book progress, target, and application URL", () => {
    const first = buildReminderEmail(input, "https://read.example.com");
    const second = buildReminderEmail(input, "https://read.example.com");

    expect(first).toEqual(second);
    expect(first.html).toContain("page 42 of 210");
    expect(first.html).toContain("15 pages");
    expect(first.html).toContain("https://read.example.com/dashboard");
    expect(first.text).toContain("page 42 of 210");
  });
});

describe("classifyEmailFailure", () => {
  it.each([
    [
      { name: "rate_limit_exceeded", statusCode: 429 },
      "RETRYABLE",
      "RESEND_RATE_LIMIT",
    ],
    [
      { name: "application_error", statusCode: 500 },
      "RETRYABLE",
      "RESEND_SERVER_ERROR",
    ],
    [
      { name: "service_unavailable", statusCode: 503 },
      "RETRYABLE",
      "RESEND_SERVER_ERROR",
    ],
    [
      { name: "resource_locked", statusCode: 409 },
      "RETRYABLE",
      "RESEND_TEMPORARY_CONFLICT",
    ],
    [
      { name: "validation_error", statusCode: 422 },
      "PERMANENT",
      "RESEND_INVALID_REQUEST",
    ],
    [
      { name: "restricted_api_key", statusCode: 401 },
      "PERMANENT",
      "PROVIDER_AUTH_ERROR",
    ],
    [
      { name: "invalid_idempotent_request", statusCode: 409 },
      "PERMANENT",
      "RESEND_IDEMPOTENCY_CONFLICT",
    ],
    [{ name: "AbortError" }, "RETRYABLE", "RESEND_TIMEOUT"],
  ] as const)("classifies %j as %s", (error, classification, errorCode) => {
    expect(classifyEmailFailure(error)).toEqual({
      classification,
      errorCode,
    });
  });

  it("classifies thrown network errors without persisting their message", () => {
    const result = classifyEmailFailure(
      new Error("request failed with Authorization: Bearer secret"),
    );

    expect(result).toEqual({
      classification: "RETRYABLE",
      errorCode: "RESEND_NETWORK_ERROR",
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
