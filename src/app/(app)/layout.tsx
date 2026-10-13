import { GetStreakUseCase } from "@/features/analytics/application";
import { DrizzleAnalyticsRepository } from "@/features/analytics/infrastructure";
import { AppShell } from "@/components/layout/AppShell";
import { config } from "@/config/env";
import { requireAuth } from "@/lib/auth/server";

export default async function ProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAuth();
  const streak = await new GetStreakUseCase(
    new DrizzleAnalyticsRepository(),
  ).execute(user.id, user.timezone);

  return (
    <AppShell
      vapidPublicKey={config.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      currentStreak={streak.currentStreak}
    >
      {children}
    </AppShell>
  );
}
