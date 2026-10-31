"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { reactions } from "../domain/notification";
import { panelKinds } from "../domain/panel";
import {
  ensureReadingReminder,
  markPanelItemRead,
  readPanel,
} from "../infrastructure/panel-repository";
import { updateNotification } from "../infrastructure/notification-repository";
export async function getNotificationCenter(input: unknown = {}) {
  const user = await requireAuth();
  const { limit } = z
    .object({ limit: z.number().int().min(1).max(500).default(50) })
    .parse(input);
  await ensureReadingReminder(user);
  return readPanel(user.id, limit);
}
export async function changeNotification(input: unknown) {
  const user = await requireAuth();
  const parsed = z
    .object({
      id: z.string().uuid(),
      kind: z.enum(panelKinds),
      reaction: z.enum(reactions).optional(),
    })
    .parse(input);
  if (parsed.reaction) {
    if (parsed.kind !== "NUDGE" && parsed.kind !== "CONGRATULATION")
      throw new Error("Only received encouragement can receive reactions.");
    await updateNotification(user.id, { ...parsed, kind: parsed.kind });
  } else await markPanelItemRead(user.id, parsed.id, parsed.kind);
  revalidatePath("/dashboard");
}
