import { requireAuth } from "@/lib/auth/server";
import { getReminderDeliveriesInputSchema } from "@/features/reminders/application";
import { DrizzleReminderDeliveryRepository } from "@/features/reminders/infrastructure";
import { GetReminderDeliveriesUseCase } from "@/features/reminders/application";
import { NextRequest, NextResponse } from "next/server";

function getUseCases() {
  const repo = new DrizzleReminderDeliveryRepository();
  return {
    getDeliveries: new GetReminderDeliveriesUseCase(repo),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const status = searchParams.get("status");

    const input = {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      status: status as "PENDING" | "SENT" | "FAILED" | "SKIPPED" | undefined,
    };

    const parsed = getReminderDeliveriesInputSchema.parse(input);

    const { getDeliveries } = getUseCases();
    const deliveries = await getDeliveries.execute(user.id, parsed);

    return NextResponse.json(deliveries.map((d) => d.toPersistence()));
  } catch (error) {
    console.error("Get reminder deliveries error:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to get reminder deliveries" },
      { status: 500 },
    );
  }
}
