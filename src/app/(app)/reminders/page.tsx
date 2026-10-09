import { config } from "@/config/env";
import { DrizzleReminderPreferenceRepository } from "@/features/reminders/infrastructure";
import { RemindersPage as RemindersPageComponent } from "@/features/reminders/ui/components/RemindersPage";
import { requireAuth } from "@/lib/auth/server";

export const runtime = "nodejs";

export default async function RemindersPage() {
  const user = await requireAuth();
  const preference =
    await new DrizzleReminderPreferenceRepository().findByUserId(user.id);
  const persisted = preference?.toPersistence();

  return (
    <RemindersPageComponent
      vapidPublicKey={config.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      initialSettings={{
        enabled: persisted?.enabled ?? false,
        emailEnabled: persisted?.emailEnabled ?? true,
        reminderTime: persisted?.reminderTime ?? "19:00:00",
        timezone: user.timezone,
        updatedAt: persisted?.updatedAt.toISOString(),
      }}
    />
  );
}
