"use client";

import dynamic from "next/dynamic";

const DailyPagesChart = dynamic(
  () => import("../charts").then((module) => module.DailyPagesChart),
  { loading: ChartPlaceholder },
);
const WeeklyChart = dynamic(
  () => import("../charts").then((module) => module.WeeklyChart),
  { loading: ChartPlaceholder },
);
const MonthlyChart = dynamic(
  () => import("../charts").then((module) => module.MonthlyChart),
  { loading: ChartPlaceholder },
);

function ChartPlaceholder() {
  return (
    <div
      className="bg-muted/60 h-72 animate-pulse rounded-lg motion-reduce:animate-none"
      role="status"
      aria-label="Loading chart"
    />
  );
}

export interface AnalyticsChartData {
  dailyData: Array<{ date: string; pagesRead: number }>;
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

export function AnalyticsCharts({ data }: { data: AnalyticsChartData }) {
  return (
    <section className="space-y-6">
      <section className="border-border bg-card min-w-0 rounded-xl border p-4 sm:p-6">
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          Daily Progress
        </h2>
        {data.dailyData.length > 0 ? (
          <DailyPagesChart data={data.dailyData} />
        ) : (
          <EmptyChart />
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="border-border bg-card min-w-0 rounded-xl border p-4 sm:p-6">
          <h2 className="text-foreground mb-4 text-xl font-semibold">
            Weekly Progress
          </h2>
          {data.weeklyData.length > 0 ? (
            <WeeklyChart data={data.weeklyData} />
          ) : (
            <EmptyChart />
          )}
        </section>

        <section className="border-border bg-card min-w-0 rounded-xl border p-4 sm:p-6">
          <h2 className="text-foreground mb-4 text-xl font-semibold">
            Monthly Progress
          </h2>
          {data.monthlyData.length > 0 ? (
            <MonthlyChart data={data.monthlyData} />
          ) : (
            <EmptyChart />
          )}
        </section>
      </div>
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="text-muted-foreground py-12 text-center">
      No reading data for this period
    </div>
  );
}
