import {
  GetAnalyticsUseCase,
  GetStreakUseCase,
} from "@/features/analytics/application";
import { DrizzleAnalyticsRepository } from "@/features/analytics/infrastructure";
import { AnalyticsPage as AnalyticsPageComponent } from "@/features/analytics/ui/components/AnalyticsPage";
import { requireAuth } from "@/lib/auth/server";

export default async function AnalyticsPage() {
  const user = await requireAuth();
  const repository = new DrizzleAnalyticsRepository();
  const [analytics, streak] = await Promise.all([
    new GetAnalyticsUseCase(repository).execute(
      user.id,
      { preset: "month" },
      user.timezone,
    ),
    new GetStreakUseCase(repository).execute(user.id, user.timezone),
  ]);

  return (
    <AnalyticsPageComponent
      analytics={{
        totalPagesRead: analytics.totalPagesRead,
        totalSessions: analytics.totalSessions,
        averagePagesPerSession: analytics.averagePagesPerSession,
        averagePagesPerDay: analytics.averagePagesPerDay,
        dailyData: analytics.dailyData.map((entry) => ({
          date: entry.date.toISOString(),
          pagesRead: entry.pagesRead,
          sessions: entry.sessions.length,
        })),
        weeklyData: analytics.weeklyData.map((entry) => ({
          ...entry,
          weekStart: entry.weekStart.toISOString(),
        })),
        monthlyData: analytics.monthlyData.map((entry) => ({
          ...entry,
          monthStart: entry.monthStart.toISOString(),
        })),
      }}
      streak={{
        ...streak,
        lastReadDate: streak.lastReadDate?.toISOString() ?? null,
      }}
    />
  );
}
