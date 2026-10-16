import { type ReadingSession } from "@/features/reading/domain";
import { Temporal } from "@js-temporal/polyfill";

export interface DayEntry {
  date: Date;
  pagesRead: number;
  sessions: ReadingSession[];
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: Date | null;
}

export interface DateRangeQuery {
  startDate: Date;
  endDate: Date;
  timezone: string;
}

export interface AnalyticsData {
  totalPagesRead: number;
  totalSessions: number;
  averagePagesPerSession: number;
  averagePagesPerDay: number;
  streak: StreakResult;
  dailyData: DayEntry[];
  weeklyData: { weekStart: Date; pagesRead: number; sessions: number }[];
  monthlyData: { monthStart: Date; pagesRead: number; sessions: number }[];
}

/**
 * Converts a UTC date to the user's timezone date (start of day)
 */
export function toUserTimezoneDate(date: Date, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/**
 * Gets the start of day in user's timezone as UTC timestamp
 */
export function getDayStartInTimezone(date: Date, timezone: string): Date {
  const userDate = toUserTimezoneDate(date, timezone);
  return new Date(`${userDate.toISOString().split("T")[0]}T00:00:00.000Z`);
}

/**
 * Gets the end of day in user's timezone as UTC timestamp
 */
export function getDayEndInTimezone(date: Date, timezone: string): Date {
  const dayStart = getDayStartInTimezone(date, timezone);
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Returns the inclusive UTC bounds for the local day containing `date`. */
export function getUserDayUtcRange(
  date: Date,
  timezone: string,
): { startDate: Date; endDate: Date } {
  const localNow = Temporal.Instant.fromEpochMilliseconds(
    date.getTime(),
  ).toZonedDateTimeISO(timezone);
  const start = localNow.startOfDay();
  const nextDay = start.add({ days: 1 });

  return {
    startDate: new Date(start.epochMilliseconds),
    endDate: new Date(nextDay.epochMilliseconds - 1),
  };
}

/**
 * Groups reading sessions by day in user's timezone
 */
export function groupSessionsByDay(
  sessions: ReadingSession[],
  timezone: string,
): Map<string, DayEntry> {
  const dayMap = new Map<string, DayEntry>();

  for (const session of sessions) {
    const sessionDate = new Date(session.readAt);
    const dayStart = getDayStartInTimezone(sessionDate, timezone);
    const dayKey = dayStart.toISOString().split("T")[0];

    const existing = dayMap.get(dayKey);
    if (existing) {
      existing.pagesRead += session.pagesRead;
      existing.sessions.push(session);
    } else {
      dayMap.set(dayKey, {
        date: new Date(dayStart),
        pagesRead: session.pagesRead,
        sessions: [session],
      });
    }
  }

  return dayMap;
}

/**
 * Calculates streak from daily data
 */
export function calculateStreak(
  dayMap: Map<string, DayEntry>,
  timezone = "UTC",
  now = new Date(),
): StreakResult {
  const dates = [...dayMap.keys()]
    .map((key) => Temporal.PlainDate.from(key))
    .sort(Temporal.PlainDate.compare);

  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastReadDate: null };
  }

  // Streaks use the reader's local calendar day, including at UTC midnight
  // and across daylight-saving changes.
  const today = Temporal.Instant.fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(timezone)
    .toPlainDate();
  const yesterday = today.subtract({ days: 1 });
  const last = dates[dates.length - 1];

  // Current streak survives until the reader's *local* day ends.
  const isContinuing =
    Temporal.PlainDate.compare(last, today) === 0 ||
    Temporal.PlainDate.compare(last, yesterday) === 0;

  let currentStreak = 0;
  if (isContinuing) {
    let expected = last;
    for (let index = dates.length - 1; index >= 0; index--) {
      if (Temporal.PlainDate.compare(dates[index], expected) !== 0) break;
      currentStreak++;
      expected = expected.subtract({ days: 1 });
    }
  }

  // The longest streak is independent of whether the current one is active.
  let longestStreak = 0;
  let run = 0;
  for (let index = 0; index < dates.length; index++) {
    if (
      index > 0 &&
      Temporal.PlainDate.compare(
        dates[index],
        dates[index - 1].add({ days: 1 }),
      ) === 0
    ) {
      run++;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
  }

  return {
    currentStreak,
    longestStreak,
    lastReadDate: new Date(`${last.toString()}T00:00:00.000Z`),
  };
}

/**
 * Filters sessions by date range in user's timezone
 */
export function filterSessionsByDateRange(
  sessions: ReadingSession[],
  startDate: Date,
  endDate: Date,
  timezone: string,
): ReadingSession[] {
  const start = getDayStartInTimezone(startDate, timezone);
  const end = getDayEndInTimezone(endDate, timezone);

  return sessions.filter((session) => {
    const sessionDate = new Date(session.readAt);
    return sessionDate >= start && sessionDate <= end;
  });
}

/**
 * Gets weekly aggregated data
 */
export function getWeeklyData(
  dayMap: Map<string, DayEntry>,
): { weekStart: Date; pagesRead: number; sessions: number }[] {
  const weekMap = new Map<string, { pagesRead: number; sessions: number }>();

  for (const [dateStr, entry] of dayMap) {
    const date = new Date(dateStr);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Sunday as week start
    const weekKey = weekStart.toISOString().split("T")[0];

    const existing = weekMap.get(weekKey);
    if (existing) {
      existing.pagesRead += entry.pagesRead;
      existing.sessions += entry.sessions.length;
    } else {
      weekMap.set(weekKey, {
        pagesRead: entry.pagesRead,
        sessions: entry.sessions.length,
      });
    }
  }

  return Array.from(weekMap.entries())
    .map(([weekStart, data]) => ({
      weekStart: new Date(weekStart),
      pagesRead: data.pagesRead,
      sessions: data.sessions,
    }))
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

/**
 * Gets monthly aggregated data
 */
export function getMonthlyData(
  dayMap: Map<string, DayEntry>,
): { monthStart: Date; pagesRead: number; sessions: number }[] {
  const monthMap = new Map<string, { pagesRead: number; sessions: number }>();

  for (const [dateStr, entry] of dayMap) {
    const date = new Date(dateStr);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthKey = monthStart.toISOString().split("T")[0];

    const existing = monthMap.get(monthKey);
    if (existing) {
      existing.pagesRead += entry.pagesRead;
      existing.sessions += entry.sessions.length;
    } else {
      monthMap.set(monthKey, {
        pagesRead: entry.pagesRead,
        sessions: entry.sessions.length,
      });
    }
  }

  return Array.from(monthMap.entries())
    .map(([monthStart, data]) => ({
      monthStart: new Date(monthStart),
      pagesRead: data.pagesRead,
      sessions: data.sessions,
    }))
    .sort((a, b) => a.monthStart.getTime() - b.monthStart.getTime());
}

/**
 * Computes full analytics from sessions
 */
export function computeAnalytics(
  sessions: ReadingSession[],
  timezone: string,
): AnalyticsData {
  const totalPagesRead = sessions.reduce((sum, s) => sum + s.pagesRead, 0);
  const totalSessions = sessions.length;
  const averagePagesPerSession =
    totalSessions > 0 ? totalPagesRead / totalSessions : 0;

  const dayMap = groupSessionsByDay(sessions, timezone);
  const dailyData = Array.from(dayMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  // Calculate average pages per day (only days with reading)
  const averagePagesPerDay =
    dailyData.length > 0 ? totalPagesRead / dailyData.length : 0;

  const streak = calculateStreak(dayMap, timezone);
  const weeklyData = getWeeklyData(groupSessionsByDay(sessions, timezone));
  const monthlyData = getMonthlyData(groupSessionsByDay(sessions, timezone));

  return {
    totalPagesRead,
    totalSessions,
    averagePagesPerSession,
    averagePagesPerDay,
    streak,
    dailyData,
    weeklyData,
    monthlyData,
  };
}

/**
 * Helper to convert UTC date to user's timezone date string (YYYY-MM-DD)
 */
export function toUserDateString(date: Date, timezone: string): string {
  return toUserTimezoneDate(date, timezone).toISOString().split("T")[0];
}

/**
 * Gets date range for common presets
 */
export function getDateRangePreset(
  preset: "week" | "month" | "quarter" | "year" | "all",
  timezone: string,
): { startDate: Date; endDate: Date } {
  const localNow = Temporal.Now.instant().toZonedDateTimeISO(timezone);
  const endDate = new Date(
    localNow.startOfDay().add({ days: 1 }).epochMilliseconds - 1,
  );

  if (preset === "all") {
    return { startDate: new Date(0), endDate };
  }

  let rangeStart: Temporal.ZonedDateTime;

  switch (preset) {
    case "week":
      rangeStart = localNow.subtract({ days: 7 });
      break;
    case "month":
      rangeStart = localNow.subtract({ months: 1 });
      break;
    case "quarter":
      rangeStart = localNow.subtract({ months: 3 });
      break;
    case "year":
      rangeStart = localNow.subtract({ years: 1 });
      break;
    default:
      rangeStart = localNow;
  }

  return {
    startDate: new Date(rangeStart.startOfDay().epochMilliseconds),
    endDate,
  };
}
