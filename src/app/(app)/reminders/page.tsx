import { config } from "@/config/env";
import { RemindersPage as RemindersPageComponent } from "@/features/reminders/ui/components/RemindersPage";

export const runtime = "nodejs";

export default function RemindersPage() {
  return (
    <RemindersPageComponent
      vapidPublicKey={config.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
    />
  );
}
