"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const formatTick = (value: number | undefined) =>
  value !== undefined && value >= 1000
    ? (value / 1000).toFixed(1) + "k"
    : value !== undefined
      ? String(value)
      : "";

const formatTooltipValue = (
  value: unknown,
  name: unknown,
): [string, string] => [
  value !== undefined ? String(value) : "0",
  name === "pagesRead" ? "Pages" : "Sessions",
];

interface DailyChartProps {
  data: Array<{ date: string; pagesRead: number }>;
  className?: string;
}

export function DailyPagesChart({ data, className }: DailyChartProps) {
  if (!data.length) return null;

  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) =>
              new Date(String(value)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--border))"
            tickFormatter={formatTick}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "0 4px 12px hsl(var(--foreground) / 0.1)",
            }}
            labelFormatter={(value) =>
              new Date(String(value)).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            }
            formatter={(value: unknown) => [
              `${Number(value) ?? 0} pages`,
              "Pages",
            ]}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="pagesRead"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPages)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface WeeklyChartProps {
  data: Array<{ weekStart: string; pagesRead: number; sessions: number }>;
  className?: string;
}

export function WeeklyChart({ data, className }: WeeklyChartProps) {
  if (!data.length) return null;

  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="weekStart"
            tickFormatter={(value) =>
              new Date(String(value)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--border))"
            tickFormatter={formatTick}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "0 4px 12px hsl(var(--foreground) / 0.1)",
            }}
            labelFormatter={(value) => {
              const date = new Date(String(value));
              const end = new Date(date);
              end.setDate(end.getDate() + 6);
              return (
                date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }) +
                " - " +
                end.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              );
            }}
            formatter={formatTooltipValue}
          />
          <Legend />
          <Bar
            dataKey="pagesRead"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="sessions"
            fill="hsl(var(--secondary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MonthlyChartProps {
  data: Array<{ monthStart: string; pagesRead: number; sessions: number }>;
  className?: string;
}

export function MonthlyChart({ data, className }: MonthlyChartProps) {
  if (!data.length) return null;

  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="monthStart"
            tickFormatter={(value) =>
              new Date(String(value)).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })
            }
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--border))"
            tickFormatter={formatTick}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "0 4px 12px hsl(var(--foreground) / 0.1)",
            }}
            labelFormatter={(value) =>
              new Date(String(value)).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            }
            formatter={(value: unknown, name: unknown): [string, string] => [
              String(Number(value) ?? 0),
              name === "pagesRead" ? "Pages" : "Sessions",
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="pagesRead"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="sessions"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  className,
}: StreakDisplayProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <div className="border-border bg-card rounded-xl border p-6">
        <div className="text-muted-foreground text-sm font-medium">
          Current Streak
        </div>
        <div className="text-primary mt-2 text-4xl font-bold">
          {currentStreak}
        </div>
        <div className="text-muted-foreground mt-1 text-sm">days</div>
      </div>
      <div className="border-border bg-card rounded-xl border p-6">
        <div className="text-muted-foreground text-sm font-medium">
          Longest Streak
        </div>
        <div className="text-accent mt-2 text-4xl font-bold">
          {longestStreak}
        </div>
        <div className="text-muted-foreground mt-1 text-sm">days</div>
      </div>
    </div>
  );
}
