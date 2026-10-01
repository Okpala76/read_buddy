import { config } from "@/config/env";

interface ResendSendOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ResendApiResponse {
  id: string;
}

export interface ResendResponse {
  id: string;
  messageId: string;
}

export class ResendEmailService {
  private readonly apiKey: string;
  private readonly fromEmail: string;

  constructor() {
    this.apiKey = config.RESEND_API_KEY ?? "";
    this.fromEmail = config.RESEND_FROM_EMAIL ?? "noreply@readbuddy.local";
  }

  async send(options: ResendSendOptions): Promise<ResendResponse> {
    if (!this.apiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from ?? this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Resend API error: ${response.status} ${error.message ?? "Unknown error"}`,
      );
    }

    const data = (await response.json()) as ResendApiResponse;
    return { id: data.id, messageId: data.id };
  }

  async sendReminder(
    to: string,
    userName: string | null,
    scheduledFor: Date,
  ): Promise<ResendResponse> {
    const greeting = userName ? `Hi ${userName},` : "Hi there,";
    const dateStr = scheduledFor.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const timeStr = scheduledFor.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const subject = `📚 Reading Reminder for ${dateStr}`;
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">📚 Reading Reminder</h1>
    </div>
    <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <p style="font-size: 18px; margin: 0 0 16px;">${greeting}</p>
      <p style="font-size: 16px; margin: 0 0 16px;">It's time for your daily reading session!</p>
      <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Scheduled for</p>
        <p style="margin: 0; font-size: 20px; font-weight: 600; color: #1f2937;">${dateStr} at ${timeStr}</p>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${config.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Open Read Buddy</a>
    </div>
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">You received this because you enabled reading reminders in Read Buddy.</p>
  </body>
</html>
    `;

    const text = `
${greeting}

It's time for your daily reading session!

Scheduled for: ${dateStr} at ${timeStr}

Open Read Buddy: ${config.NEXT_PUBLIC_APP_URL}/dashboard

You received this because you enabled reading reminders in Read Buddy.
    `.trim();

    const response = await this.send({
      from: this.fromEmail,
      to,
      subject,
      html,
      text,
    });

    return response;
  }
}

export const resendEmailService = new ResendEmailService();
