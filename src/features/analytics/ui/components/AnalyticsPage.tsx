import {
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  CalendarDays,
  BarChart2,
} from "lucide-react";
import { AnalyticsCharts } from "./AnalyticsCharts";

export interface AnalyticsPageData {
  totalPagesRead: number;
  totalSessions: number;
  averagePagesPerSession: number;
  averagePagesPerDay: number;
  dailyData: Array<{
    date: string;
    pagesRead: number;
    sessions: number;
  }>;
  weeklyData: Array<{
    weekStart: string;
    pagesRead: number;
    sessions: number;
  }>;
  monthlyData: Array<{
    monthStart: string;
    pagesRead: number;
    sessions: number;
  }>;
}

export function AnalyticsPage({
  analytics,
  streak,
}: {
  analytics: AnalyticsPageData;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastReadDate: string | null;
  };
}) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Track your reading progress and habits
          </p>
        </div>
      </div>

      {/* Streak Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-3">
              <TrendingUp className="text-primary h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Current Streak</p>
              <p className="text-foreground text-2xl font-bold">
                {streak.currentStreak}
              </p>
            </div>
          </div>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="bg-chart-3/15 rounded-lg p-3">
              <Award className="text-chart-3 h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Longest Streak</p>
              <p className="text-foreground text-2xl font-bold">
                {streak.longestStreak}
              </p>
            </div>
          </div>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="bg-chart-2/15 rounded-lg p-3">
              <CalendarDays
                className="text-chart-2 h-6 w-6"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total Days Read</p>
              <p className="text-foreground text-2xl font-bold">
                {analytics.dailyData.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-3">
              <BookOpen className="text-primary h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-foreground font-medium">Total Pages</p>
              <p className="text-foreground text-2xl font-bold">
                {analytics.totalPagesRead}
              </p>
            </div>
          </div>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="bg-chart-3/15 rounded-lg p-3">
              <BarChart2 className="text-chart-3 h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total Sessions</p>
              <p className="text-foreground text-2xl font-bold">
                {analytics.totalSessions}
              </p>
            </div>
          </div>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="bg-chart-5/15 rounded-lg p-3">
              <Calendar className="text-chart-5 h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Avg Pages/Session</p>
              <p className="text-foreground text-2xl font-bold">
                {analytics.averagePagesPerSession.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
        <div className="border-border bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="bg-chart-4/15 rounded-lg p-3">
              <CalendarDays
                className="text-chart-4 h-6 w-6"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Avg Pages/Day</p>
              <p className="text-foreground text-2xl font-bold">
                {analytics.averagePagesPerDay.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <AnalyticsCharts data={analytics} />
    </div>
  );
}
