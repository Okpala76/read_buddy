"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  CalendarDays,
  BarChart2,
} from "lucide-react";
import { DailyPagesChart, WeeklyChart, MonthlyChart } from "../charts";

interface AnalyticsData {
  totalPagesRead: number;
  totalSessions: number;
  averagePagesPerSession: number;
  averagePagesPerDay: number;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastReadDate: Date | null;
  };
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

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [streak, setStreak] = useState<{
    currentStreak: number;
    longestStreak: number;
    lastReadDate: Date | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [analyticsResponse, streakResponse] = await Promise.all([
          fetch(`/api/analytics?preset=month`),
          fetch(`/api/analytics/streak`),
        ]);
        if (!analyticsResponse.ok || !streakResponse.ok) {
          throw new Error("Analytics request failed");
        }
        const [analyticsData, streakData] = await Promise.all([
          analyticsResponse.json(),
          streakResponse.json(),
        ]);
        if (mounted) {
          setAnalytics(analyticsData);
          setStreak(streakData);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load analytics");
          console.error(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2
          className="text-primary h-8 w-8 animate-spin"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

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
                {streak?.currentStreak ?? 0}
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
                {streak?.longestStreak ?? 0}
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
                {analytics?.dailyData.length ?? 0}
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
                {analytics?.totalPagesRead ?? 0}
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
                {analytics?.totalSessions ?? 0}
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
                {analytics?.averagePagesPerSession?.toFixed(1) ?? "0"}
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
                {analytics?.averagePagesPerDay?.toFixed(1) ?? "0"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Charts */}
      <section className="space-y-6">
        <section className="border-border bg-card min-w-0 rounded-xl border p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-xl font-semibold">
              Daily Progress
            </h2>
          </div>
          {analytics?.dailyData && analytics.dailyData.length > 0 ? (
            <DailyPagesChart
              data={analytics.dailyData.map((d) => ({
                date: d.date,
                pagesRead: d.pagesRead,
              }))}
            />
          ) : (
            <div className="text-muted-foreground py-12 text-center">
              No reading data for this period
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="border-border bg-card min-w-0 rounded-xl border p-4 sm:p-6">
            <h2 className="text-foreground mb-4 text-xl font-semibold">
              Weekly Progress
            </h2>
            {analytics?.weeklyData && analytics.weeklyData.length > 0 ? (
              <WeeklyChart
                data={analytics.weeklyData.map((d) => ({
                  weekStart: d.weekStart,
                  pagesRead: d.pagesRead,
                  sessions: d.sessions,
                }))}
              />
            ) : (
              <div className="text-muted-foreground py-12 text-center">
                No weekly data for this period
              </div>
            )}
          </section>

          <section className="border-border bg-card min-w-0 rounded-xl border p-4 sm:p-6">
            <h2 className="text-foreground mb-4 text-xl font-semibold">
              Monthly Progress
            </h2>
            {analytics?.monthlyData && analytics.monthlyData.length > 0 ? (
              <MonthlyChart
                data={analytics.monthlyData.map((d) => ({
                  monthStart: d.monthStart,
                  pagesRead: d.pagesRead,
                  sessions: d.sessions,
                }))}
              />
            ) : (
              <div className="text-muted-foreground py-12 text-center">
                No monthly data for this period
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
