import { type ReadingSession } from "@/features/reading/domain";

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
export function calculateStreak(dayMap: Map<string, DayEntry>): StreakResult {
  if (dayMap.size === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
    };
  }

  // Get all dates with reading activity, sorted
  const datesWithReading = Array.from(dayMap.keys())
    .map((k) => new Date(k))
    .sort((a, b) => a.getTime() - b.getTime());

  const today = new Date();
  const todayStart = new Date(today.toISOString().split("T")[0]);

  let currentStreak = 0;
  let longestStreak = 0;
  let lastReadDate: Date | null = null;

  // Check from most recent date backwards
  for (let i = datesWithReading.length - 1; i >= 0; i--) {
    const currentDate = datesWithReading[i];
    const expectedDate = new Date(todayStart);
    expectedDate.setDate(expectedDate.getDate() - currentStreak);

    if (currentDate.getTime() === expectedDate.getTime()) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
      lastReadDate = currentDate;
    } else if (currentDate < expectedDate) {
      // Gap found, streak broken
      break;
    }
  }

  // If no reading today, check if yesterday was read
  if (currentStreak === 0 && datesWithReading.length > 0) {
    const lastDate = datesWithReading[datesWithReading.length - 1];
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate.getTime() === yesterday.getTime()) {
      // Start counting from yesterday
      currentStreak = 1;
      longestStreak = Math.max(longestStreak, 1);
      lastReadDate = lastDate;

      // Continue checking backwards
      for (let i = datesWithReading.length - 2; i >= 0; i--) {
        const currentDate = datesWithReading[i];
        const expectedDate = new Date(yesterday);
        expectedDate.setDate(expectedDate.getDate() - (currentStreak - 1));

        if (currentDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
          lastReadDate = currentDate;
        } else if (currentDate < expectedDate) {
          break;
        }
      }
    }

    // Calculate longest streak overall
    let tempStreak = 0;
    for (let i = 0; i < datesWithReading.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = datesWithReading[i - 1];
        const currentDate = datesWithReading[i];
        const diffDays = Math.round(
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastReadDate,
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

  const streak = calculateStreak(groupSessionsByDay(sessions, timezone));
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
  const now = new Date();
  const userNow = new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      dateStyle: "short",
    }).format(now),
  );

  let startDate: Date;
  const endDate = getDayEndInTimezone(now, timezone);

  switch (preset) {
    case "week":
      startDate = new Date(userNow);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate = new Date(userNow);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "quarter":
      startDate = new Date(userNow);
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "year":
      startDate = new Date(userNow);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case "all":
    default:
      startDate = new Date(0); // Unix epoch
      break;
  }

  return { startDate: getDayStartInTimezone(startDate, timezone), endDate };
}
