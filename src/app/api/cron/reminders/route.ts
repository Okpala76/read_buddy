import { config } from "@/config/env";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  DrizzleReminderDeliveryRepository,
  DrizzleReminderPreferenceRepository,
} from "@/features/reminders/infrastructure";
import { ProcessReminderDeliveriesUseCase } from "@/features/reminders/application";
import { resendEmailService } from "@/features/reminders/infrastructure";
import { NextResponse } from "next/server";

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

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

    const deliveryRepo = new DrizzleReminderDeliveryRepository();
    const prefRepo = new DrizzleReminderPreferenceRepository();

    const processUseCase = new ProcessReminderDeliveriesUseCase(
      deliveryRepo,
      prefRepo,
      async (userId: string, delivery: { id: string; scheduledFor: Date }) => {
        const userResult = await getDb()
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!userResult[0]?.email) {
          throw new Error("User email not found");
        }

        return resendEmailService.sendReminder(
          userResult[0].email,
          userResult[0].name,
          delivery.scheduledFor,
        );
      },
    );

    const result = await processUseCase.execute(now, 100);

    return NextResponse.json({
      success: true,
      ...result,
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
