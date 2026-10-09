import { describe, expect, it } from "vitest";
import {
  ReadingSession,
  type ReadingSessionProps,
} from "@/features/reading/domain";
import {
  toUserTimezoneDate,
  getDayStartInTimezone,
  getDayEndInTimezone,
  getUserDayUtcRange,
  groupSessionsByDay,
  calculateStreak,
  filterSessionsByDateRange,
  getWeeklyData,
  getMonthlyData,
  computeAnalytics,
  toUserDateString,
  getDateRangePreset,
} from "@/features/analytics/domain";

function createSession(
  overrides: Partial<ReadingSessionProps> = {},
): ReadingSession {
  return ReadingSession.reconstitute({
    id: "1",
    userId: "user-1",
    bookId: "book-1",
    startPage: 0,
    endPage: 10,
    pagesRead: 10,
    mood: "FOCUSED",
    readAt: new Date("2024-01-15T15:30:00Z"),
    createdAt: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  });
}

function formatInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

describe("Analytics domain", () => {
  describe("toUserTimezoneDate", () => {
    it("converts UTC date to user timezone date", () => {
      const date = new Date("2024-01-15T15:30:00Z");
      const result = toUserTimezoneDate(date, "UTC");
      expect(formatInTimezone(result, "UTC")).toBe("2024-01-15");
    });

    it("handles timezone crossing midnight", () => {
      const date = new Date("2024-01-16T01:30:00Z");
      const result = toUserTimezoneDate(date, "UTC");
      expect(formatInTimezone(result, "UTC")).toBe("2024-01-16");
    });
  });

  describe("getDayStartInTimezone", () => {
    it("returns start of day in user timezone as UTC", () => {
      const date = new Date("2024-01-15T15:30:00Z");
      const result = getDayStartInTimezone(date, "UTC");
      expect(formatInTimezone(result, "UTC")).toBe("2024-01-15");
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
    });
  });

  describe("getDayEndInTimezone", () => {
    it("returns end of day in user timezone as UTC", () => {
      const date = new Date("2024-01-15T15:30:00Z");
      const result = getDayEndInTimezone(date, "UTC");
      expect(formatInTimezone(result, "UTC")).toBe("2024-01-15");
      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
    });
  });

  describe("getUserDayUtcRange", () => {
    it("returns the UTC bounds for a non-UTC local day", () => {
      const range = getUserDayUtcRange(
        new Date("2026-01-10T18:00:00.000Z"),
        "America/Toronto",
      );

      expect(range.startDate.toISOString()).toBe("2026-01-10T05:00:00.000Z");
      expect(range.endDate.toISOString()).toBe("2026-01-11T04:59:59.999Z");
    });

    it("honors daylight-saving day length", () => {
      const range = getUserDayUtcRange(
        new Date("2026-03-08T18:00:00.000Z"),
        "America/Toronto",
      );

      expect(range.startDate.toISOString()).toBe("2026-03-08T05:00:00.000Z");
      expect(range.endDate.toISOString()).toBe("2026-03-09T03:59:59.999Z");
    });
  });

  describe("groupSessionsByDay", () => {
    it("groups sessions by day in user timezone", () => {
      const sessions = [
        createSession({
          id: "1",
          readAt: new Date("2024-01-15T15:30:00Z"),
          pagesRead: 10,
          endPage: 10,
        }),
        createSession({
          id: "2",
          readAt: new Date("2024-01-15T20:00:00Z"),
          pagesRead: 15,
          endPage: 15,
        }),
        createSession({
          id: "3",
          readAt: new Date("2024-01-16T15:30:00Z"),
          pagesRead: 20,
          endPage: 20,
        }),
      ];

      const dayMap = groupSessionsByDay(sessions, "UTC");
      expect(dayMap.size).toBe(2);

      const day1 = dayMap.get("2024-01-15");
      expect(day1).toBeDefined();
      expect(day1?.pagesRead).toBe(25);
      expect(day1?.sessions.length).toBe(2);

      const day2 = dayMap.get("2024-01-16");
      expect(day2).toBeDefined();
      expect(day2?.pagesRead).toBe(20);
    });

    it("handles empty sessions", () => {
      const dayMap = groupSessionsByDay([], "UTC");
      expect(dayMap.size).toBe(0);
    });
  });

  describe("calculateStreak", () => {
    it("returns zero streak for empty data", () => {
      const dayMap = new Map();
      const result = calculateStreak(dayMap);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.lastReadDate).toBeNull();
    });

    it("calculates current streak correctly", () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

      const dayMap = new Map();
      dayMap.set(todayStr, {
        date: new Date(todayStr),
        pagesRead: 10,
        sessions: [],
      });
      dayMap.set(yesterdayStr, {
        date: new Date(yesterdayStr),
        pagesRead: 10,
        sessions: [],
      });
      dayMap.set(twoDaysAgoStr, {
        date: new Date(twoDaysAgoStr),
        pagesRead: 10,
        sessions: [],
      });

      const result = calculateStreak(dayMap);
      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
    });

    it("handles gap in streak", () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

      const dayMap = new Map();
      dayMap.set(todayStr, {
        date: new Date(todayStr),
        pagesRead: 10,
        sessions: [],
      });
      dayMap.set(threeDaysAgoStr, {
        date: new Date(threeDaysAgoStr),
        pagesRead: 10,
        sessions: [],
      });

      const result = calculateStreak(dayMap);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
    });
  });

  describe("filterSessionsByDateRange", () => {
    it("filters sessions within date range", () => {
      const sessions = [
        createSession({ id: "1", readAt: new Date("2024-01-10T15:30:00Z") }),
        createSession({ id: "2", readAt: new Date("2024-01-15T15:30:00Z") }),
        createSession({ id: "3", readAt: new Date("2024-01-20T15:30:00Z") }),
      ];

      const start = new Date("2024-01-12T00:00:00Z");
      const end = new Date("2024-01-18T23:59:59Z");

      const filtered = filterSessionsByDateRange(sessions, start, end, "UTC");
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("2");
    });
  });

  describe("getWeeklyData", () => {
    it("aggregates data by week (Sunday start)", () => {
      const dayMap = new Map();
      dayMap.set("2024-01-07", {
        date: new Date("2024-01-07"),
        pagesRead: 10,
        sessions: [],
      });
      dayMap.set("2024-01-08", {
        date: new Date("2024-01-08"),
        pagesRead: 15,
        sessions: [],
      });
      dayMap.set("2024-01-14", {
        date: new Date("2024-01-14"),
        pagesRead: 20,
        sessions: [],
      });

      const weekly = getWeeklyData(dayMap);
      expect(weekly.length).toBe(2);
      expect(weekly[0].pagesRead).toBe(25);
      expect(weekly[1].pagesRead).toBe(20);
    });
  });

  describe("getMonthlyData", () => {
    it("aggregates data by month", () => {
      const dayMap = new Map();
      dayMap.set("2024-01-15", {
        date: new Date("2024-01-15"),
        pagesRead: 10,
        sessions: [],
      });
      dayMap.set("2024-01-20", {
        date: new Date("2024-01-20"),
        pagesRead: 15,
        sessions: [],
      });
      dayMap.set("2024-02-05", {
        date: new Date("2024-02-05"),
        pagesRead: 20,
        sessions: [],
      });

      const monthly = getMonthlyData(dayMap);
      expect(monthly.length).toBe(2);
      expect(monthly[0].pagesRead).toBe(25);
      expect(monthly[1].pagesRead).toBe(20);
    });
  });

  describe("computeAnalytics", () => {
    it("computes full analytics from sessions", () => {
      const sessions = [
        createSession({ id: "1", pagesRead: 10, endPage: 10 }),
        createSession({ id: "2", pagesRead: 20, endPage: 20 }),
      ];

      const result = computeAnalytics(sessions, "UTC");

      expect(result.totalPagesRead).toBe(30);
      expect(result.totalSessions).toBe(2);
      expect(result.averagePagesPerSession).toBe(15);
      expect(result.averagePagesPerDay).toBe(30); // Both sessions on same day
      expect(result.dailyData.length).toBe(1);
      expect(result.dailyData[0].pagesRead).toBe(30);
    });

    it("handles empty sessions", () => {
      const result = computeAnalytics([], "UTC");
      expect(result.totalPagesRead).toBe(0);
      expect(result.totalSessions).toBe(0);
      expect(result.averagePagesPerSession).toBe(0);
      expect(result.averagePagesPerDay).toBe(0);
    });
  });

  describe("toUserDateString", () => {
    it("formats date as YYYY-MM-DD in user timezone", () => {
      const date = new Date("2024-01-15T15:30:00Z");
      const result = toUserDateString(date, "UTC");
      expect(result).toBe("2024-01-15");
    });
  });

  describe("getDateRangePreset", () => {
    it("returns correct date ranges for presets", () => {
      const weekRange = getDateRangePreset("week", "UTC");
      expect(weekRange.startDate).toBeInstanceOf(Date);
      expect(weekRange.endDate).toBeInstanceOf(Date);
      expect(weekRange.endDate > weekRange.startDate).toBe(true);

      const allRange = getDateRangePreset("all", "UTC");
      // "all" preset returns epoch start (0) adjusted to day start in timezone
      expect(allRange.startDate.getTime()).toBeLessThanOrEqual(0);
    });
  });
});
