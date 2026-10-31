"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { reactions } from "../domain/notification";
import {
  readNotifications,
  readSocialPreferences,
  updateNotification,
  writeSocialPreferences,
} from "../infrastructure/notification-repository";
const notificationInput = z.object({
  id: z.string().uuid(),
  kind: z.enum([
    "NUDGE",
    "CONGRATULATION",
    "NUDGE_REACTION",
    "CONGRATULATION_REACTION",
  ]),
  reaction: z.enum(reactions).optional(),
});
const settingsInput = z.object({
  receiveNudges: z.boolean(),
  shareMilestones: z.boolean(),
});
export async function getNotificationCenter() {
  const user = await requireAuth();
  const [notifications, settings] = await Promise.all([
    readNotifications(user.id),
    readSocialPreferences(user.id),
  ]);
  return { notifications, settings };
}
export async function changeNotification(input: unknown) {
  const user = await requireAuth();
  await updateNotification(user.id, notificationInput.parse(input));
  revalidatePath("/notifications");
}
export async function saveSocialPreferences(input: unknown) {
  const user = await requireAuth();
  await writeSocialPreferences(user.id, settingsInput.parse(input));
  revalidatePath("/notifications");
  revalidatePath("/friends");
}
