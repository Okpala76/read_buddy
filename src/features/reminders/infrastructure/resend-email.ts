import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailRequestOptions,
  type CreateEmailResponse,
} from "resend";

import { config } from "@/config/env";
import type {
  ReminderEmailFailureCode,
  ReminderEmailInput,
  ReminderEmailSendResult,
  ReminderEmailSender,
} from "@/features/reminders/application";

interface ResendClient {
  emails: {
    send(
      payload: CreateEmailOptions,
      requestOptions?: CreateEmailRequestOptions,
    ): Promise<CreateEmailResponse>;
  };
}

interface ResendErrorLike {
  name?: unknown;
  statusCode?: unknown;
  code?: unknown;
}

export interface ClassifiedEmailFailure {
  classification: "RETRYABLE" | "PERMANENT";
  errorCode: ReminderEmailFailureCode;
}

export interface ReminderEmailContent {
  subject: string;
  html: string;
  text: string;
}

const RETRYABLE_CONFLICTS = new Set([
  "concurrent_idempotent_requests",
  "resource_locked",
]);

function errorFields(error: unknown): {
  name: string;
  statusCode: number | null;
  code: string;
} {
  if (!error || typeof error !== "object") {
    return { name: "", statusCode: null, code: "" };
  }

  const value = error as ResendErrorLike;
  return {
    name: typeof value.name === "string" ? value.name : "",
    statusCode: typeof value.statusCode === "number" ? value.statusCode : null,
    code: typeof value.code === "string" ? value.code : "",
  };
}

export function classifyEmailFailure(error: unknown): ClassifiedEmailFailure {
  const { name, statusCode, code } = errorFields(error);

  if (
    name === "AbortError" ||
    name === "TimeoutError" ||
    code === "ETIMEDOUT"
  ) {
    return { classification: "RETRYABLE", errorCode: "RESEND_TIMEOUT" };
  }

  if (statusCode === 429 || name === "rate_limit_exceeded") {
    return { classification: "RETRYABLE", errorCode: "RESEND_RATE_LIMIT" };
  }

  if (statusCode !== null && statusCode >= 500) {
    return { classification: "RETRYABLE", errorCode: "RESEND_SERVER_ERROR" };
  }

  if (statusCode === 409 && RETRYABLE_CONFLICTS.has(name)) {
    return {
      classification: "RETRYABLE",
      errorCode: "RESEND_TEMPORARY_CONFLICT",
    };
  }

  if (statusCode === 409 || name === "invalid_idempotent_request") {
    return {
      classification: "PERMANENT",
      errorCode: "RESEND_IDEMPOTENCY_CONFLICT",
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      classification: "PERMANENT",
      errorCode: "PROVIDER_AUTH_ERROR",
    };
  }

  if (statusCode !== null && statusCode >= 400 && statusCode < 500) {
    return {
      classification: "PERMANENT",
      errorCode: "RESEND_INVALID_REQUEST",
    };
  }

  if (error instanceof Error) {
    return {
      classification: "RETRYABLE",
      errorCode: "RESEND_NETWORK_ERROR",
    };
  }

  return {
    classification: "RETRYABLE",
    errorCode: "UNKNOWN_PROVIDER_ERROR",
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildReminderEmail(
  input: ReminderEmailInput,
  appUrl: string,
): ReminderEmailContent {
  const bookTitle = input.bookTitle ?? "your current book";
  const progress =
    input.bookCurrentPage !== null && input.bookTotalPages !== null
      ? `You are on page ${input.bookCurrentPage} of ${input.bookTotalPages}.`
      : "Your current book is waiting for you.";
  const dashboardUrl = new URL("/dashboard", appUrl).toString();

  return {
    subject: `Time to read: ${bookTitle}`,
    html: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 24px; margin-bottom: 16px;">Time for a reading break</h1>
    <p>Your next pages in <strong>${escapeHtml(bookTitle)}</strong> are ready.</p>
    <p>${escapeHtml(progress)}</p>
    <p>Today's reading target is <strong>${input.dailyPageTarget} pages</strong>.</p>
    <p><a href="${escapeHtml(dashboardUrl)}" style="display: inline-block; padding: 12px 20px; border-radius: 6px; background: #1d4ed8; color: #ffffff; text-decoration: none;">Open Read Buddy</a></p>
    <p style="font-size: 12px; color: #6b7280;">You received this transactional email because reading reminders are enabled in Read Buddy.</p>
  </body>
</html>`,
    text: `Time for a reading break

Your next pages in ${bookTitle} are ready.
${progress}
Today's reading target is ${input.dailyPageTarget} pages.

Open Read Buddy: ${dashboardUrl}

You received this transactional email because reading reminders are enabled in Read Buddy.`,
  };
}

export class ResendEmailService implements ReminderEmailSender {
  private readonly client: ResendClient | null;

  constructor(
    private readonly settings: {
      apiKey?: string;
      fromEmail?: string;
      appUrl?: string;
      client?: ResendClient;
    } = {},
  ) {
    const apiKey = settings.apiKey ?? config.RESEND_API_KEY;
    this.client = settings.client ?? (apiKey ? new Resend(apiKey) : null);
  }

  async sendReminder(
    input: ReminderEmailInput,
  ): Promise<ReminderEmailSendResult> {
    const fromEmail = this.settings.fromEmail ?? config.RESEND_FROM_EMAIL;
    if (!this.client || !fromEmail) {
      return {
        status: "FAILED",
        classification: "PERMANENT",
        errorCode: "PROVIDER_CONFIG_ERROR",
      };
    }

    const content = buildReminderEmail(
      input,
      this.settings.appUrl ?? config.NEXT_PUBLIC_APP_URL,
    );

    try {
      const { data, error } = await this.client.emails.send(
        {
          from: fromEmail,
          to: input.recipientEmail,
          ...content,
        },
        { idempotencyKey: `reading-reminder/${input.deliveryId}` },
      );

      if (error) {
        return { status: "FAILED", ...classifyEmailFailure(error) };
      }

      return { status: "ACCEPTED", providerMessageId: data.id };
    } catch (error) {
      return { status: "FAILED", ...classifyEmailFailure(error) };
    }
  }
}

export const resendEmailService = new ResendEmailService();
