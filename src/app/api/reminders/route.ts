import { requireAuth } from "@/lib/auth/server";
import { updateReminderPreferenceInputSchema } from "@/features/reminders/application";
import { DrizzleReminderPreferenceRepository } from "@/features/reminders/infrastructure";
import {
  GetReminderSettingsUseCase,
  UpdateReminderPreferenceUseCase,
} from "@/features/reminders/application";
import { NextRequest, NextResponse } from "next/server";

function getUseCases() {
  const repo = new DrizzleReminderPreferenceRepository();
  return {
    getSettings: new GetReminderSettingsUseCase(repo),
    updatePreference: new UpdateReminderPreferenceUseCase(repo),
  };
}

export async function GET() {
  try {
    const user = await requireAuth();
    const { getSettings } = getUseCases();
    const { preference, timezone } = await getSettings.execute(user.id);

    if (!preference) {
      return NextResponse.json({
        enabled: false,
        emailEnabled: true,
        reminderTime: "19:00:00",
        timezone,
      });
    }

    return NextResponse.json({ ...preference.toPersistence(), timezone });
  } catch (error) {
    console.error("Get reminder preference error:", error);
    return NextResponse.json(
      { error: "Failed to get reminder preference" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = updateReminderPreferenceInputSchema.parse(body);

    const { updatePreference } = getUseCases();
    const { preference, timezone } = await updatePreference.execute(
      user.id,
      parsed,
    );

    return NextResponse.json({ ...preference.toPersistence(), timezone });
  } catch (error) {
    console.error("Update reminder preference error:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update reminder preference" },
      { status: 500 },
    );
  }
}
