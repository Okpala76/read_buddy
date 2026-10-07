import { config } from "@/config/env";
import {
  DrizzleReminderDispatchRepository,
  DrizzleReminderSchedulingRepository,
  ResendEmailService,
} from "@/features/reminders/infrastructure";
import { ScheduledPushNotificationService } from "@/features/push-notifications/infrastructure";
import {
  ProcessReminderDeliveriesUseCase,
  ScheduleDueRemindersUseCase,
} from "@/features/reminders/application";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = config.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    const schedulingRepo = new DrizzleReminderSchedulingRepository();
    const dispatchRepo = new DrizzleReminderDispatchRepository();
    const emailSender = new ResendEmailService();
    const pushSender = new ScheduledPushNotificationService();
    const scheduleUseCase = new ScheduleDueRemindersUseCase(schedulingRepo);
    const processUseCase = new ProcessReminderDeliveriesUseCase(
      dispatchRepo,
      emailSender,
      pushSender,
    );

    const schedulingResult = await scheduleUseCase.execute(now);
    const processingResult = await processUseCase.execute(now);

    return NextResponse.json({
      success: true,
      ...schedulingResult,
      ...processingResult,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Process reminders cron error:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 },
    );
  }
}
