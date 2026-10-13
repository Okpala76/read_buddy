import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Award,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { AnalyticsCharts } from "./AnalyticsCharts";

export interface AnalyticsPageData {
  totalPagesRead: number;
  totalSessions: number;
  averagePagesPerSession: number;
  averagePagesPerDay: number;
  dailyData: Array<{ date: string; pagesRead: number; sessions: number }>;
  weeklyData: Array<{ weekStart: string; pagesRead: number; sessions: number }>;
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
  const readingDays = analytics.dailyData.filter(
    (day) => day.sessions > 0,
  ).length;
  const hasHistory = analytics.totalSessions > 0;
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-primary text-sm font-medium">Your progress</p>
        <h1 className="text-foreground mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          See how far you’ve come.
        </h1>
        <p className="text-muted-foreground mt-2">
          Every reading session counts. Follow your consistency and progress
          over time.
        </p>
      </header>

      <section
        aria-labelledby="consistency-heading"
        className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm"
      >
        <div className="grid lg:grid-cols-[1.3fr_1fr]">
          <div className="p-6 sm:p-8">
            <div className="text-primary flex items-center gap-2 text-sm font-medium">
              <Flame className="size-5" aria-hidden="true" />
              Reading consistency
            </div>
            <h2
              id="consistency-heading"
              className="text-foreground mt-5 text-5xl font-semibold tracking-tight"
            >
              {streak.currentStreak}{" "}
              <span className="text-2xl">
                {" "}
                {streak.currentStreak === 1 ? "day" : "days"}
              </span>
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {streak.currentStreak > 0
                ? "Your current reading streak. A little reading each day adds up."
                : hasHistory
                  ? "A fresh streak can begin with your next reading session."
                  : "Your reading journey starts with a single session."}
            </p>
            <Link
              href="/sessions"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors"
            >
              Log reading <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="bg-muted/40 border-border grid grid-cols-2 gap-4 border-t p-6 sm:p-8 lg:border-t-0 lg:border-l">
            <div>
              <Award className="text-primary mb-3 size-5" aria-hidden="true" />
              <p className="text-foreground text-3xl font-semibold">
                {streak.longestStreak}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Best streak (days)
              </p>
            </div>
            <div>
              <CalendarDays
                className="text-primary mb-3 size-5"
                aria-hidden="true"
              />
              <p className="text-foreground text-3xl font-semibold">
                {readingDays}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Reading days in this view
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="milestones-heading">
        <div className="mb-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Your effort
          </p>
          <h2
            id="milestones-heading"
            className="text-foreground mt-1 text-xl font-semibold"
          >
            The pages add up
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border-border bg-card rounded-2xl border p-5">
            <BookOpen className="text-primary mb-4 size-5" aria-hidden="true" />
            <p className="text-foreground text-3xl font-semibold">
              {analytics.totalPagesRead}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Total pages read
            </p>
          </div>
          <div className="border-border bg-card rounded-2xl border p-5">
            <TrendingUp
              className="text-primary mb-4 size-5"
              aria-hidden="true"
            />
            <p className="text-foreground text-3xl font-semibold">
              {analytics.averagePagesPerDay.toFixed(1)}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Average pages per day
            </p>
          </div>
          <div className="border-border bg-card rounded-2xl border p-5">
            <CalendarDays
              className="text-primary mb-4 size-5"
              aria-hidden="true"
            />
            <p className="text-foreground text-3xl font-semibold">
              {analytics.totalSessions}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Reading sessions logged
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Reading trends">
        <div className="mb-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Explore
          </p>
          <h2 className="text-foreground mt-1 text-xl font-semibold">
            Your reading trends
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            See how your reading changes across days, weeks and months.
          </p>
        </div>
        <AnalyticsCharts data={analytics} />
      </section>
      <p className="text-muted-foreground text-sm">
        Average pages per session: {analytics.averagePagesPerSession.toFixed(1)}
        . Progress comes from the reading sessions you log.
      </p>
    </div>
  );
}
