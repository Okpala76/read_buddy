"use server";

import { requireAuth } from "@/lib/auth/server";
import { DrizzleReminderPreferenceRepository } from "@/features/reminders/infrastructure";
import {
  GetReminderSettingsUseCase,
  UpdateReminderPreferenceUseCase,
  updateReminderPreferenceInputSchema,
} from "@/features/reminders/application";

function getUseCases() {
  const repo = new DrizzleReminderPreferenceRepository();
  return {
    getSettings: new GetReminderSettingsUseCase(repo),
    updatePreference: new UpdateReminderPreferenceUseCase(repo),
  };
}

export async function getReminderPreference() {
  const user = await requireAuth();
  const { getSettings } = getUseCases();
  const { preference, timezone } = await getSettings.execute(user.id);
  return {
    ...(preference?.toPersistence() ?? {
      enabled: false,
      emailEnabled: true,
      reminderTime: "19:00:00",
    }),
    timezone,
  };
}

export async function updateReminderPreference(input: unknown) {
  const user = await requireAuth();
  const { updatePreference } = getUseCases();
  const parsed = updateReminderPreferenceInputSchema.parse(input);
  const { preference, timezone } = await updatePreference.execute(
    user.id,
    parsed,
  );
  return { ...preference.toPersistence(), timezone };
}
