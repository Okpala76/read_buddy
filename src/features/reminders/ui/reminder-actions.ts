"use server";

import { requireAuth } from "@/lib/auth/server";
import { DrizzleReminderPreferenceRepository } from "@/features/reminders/infrastructure";
import {
  GetReminderPreferenceUseCase,
  UpdateReminderPreferenceUseCase,
  updateReminderPreferenceInputSchema,
} from "@/features/reminders/application";

function getUseCases() {
  const repo = new DrizzleReminderPreferenceRepository();
  return {
    getPreference: new GetReminderPreferenceUseCase(repo),
    updatePreference: new UpdateReminderPreferenceUseCase(repo),
  };
}

export async function getReminderPreference() {
  const user = await requireAuth();
  const { getPreference } = getUseCases();
  return getPreference.execute(user.id, {});
}

export async function updateReminderPreference(input: unknown) {
  const user = await requireAuth();
  const { updatePreference } = getUseCases();
  const parsed = updateReminderPreferenceInputSchema.parse(input);
  return updatePreference.execute(user.id, parsed);
}
