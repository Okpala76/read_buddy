import { describe, expect, it } from "vitest";
import { Temporal } from "@js-temporal/polyfill";

import {
  calculateStreak,
  getUserReadingDates,
  getStreakEligibility,
} from "./streak";

function utc(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

function session(date: Date): { readAt: Date } {
  return { readAt: date };
}

describe("getUserReadingDates", () => {
  it("converts UTC sessions to user local dates", () => {
    const sessions = [
      session(utc(2026, 1, 1, 0, 30)), // 00:30 UTC = Jan 1 in UTC
      session(utc(2026, 1, 1, 23, 30)), // 23:30 UTC = Jan 1 in UTC
      session(utc(2026, 1, 2, 0, 30)), // 00:30 UTC = Jan 2 in UTC
    ];
    const dates = getUserReadingDates(sessions, "UTC");
    expect(dates.map((d) => d.toString())).toEqual([
      "2026-01-01",
      "2026-01-02",
    ]);
  });

  it("handles timezone conversion at UTC boundaries", () => {
    const sessions = [
      session(utc(2026, 1, 2, 0, 30)), // 00:30 UTC = Jan 1 19:30 America/Toronto (EST)
    ];
    const dates = getUserReadingDates(sessions, "America/Toronto");
    expect(dates.map((d) => d.toString())).toEqual(["2026-01-01"]);
  });

  it("deduplicates multiple sessions on the same local date", () => {
    const sessions = [
      session(utc(2026, 1, 1, 10, 0)),
      session(utc(2026, 1, 1, 14, 0)),
      session(utc(2026, 1, 1, 20, 0)),
    ];
    const dates = getUserReadingDates(sessions, "UTC");
    expect(dates.length).toBe(1);
    expect(dates[0].toString()).toBe("2026-01-01");
  });

  it("returns empty array for no sessions", () => {
    expect(getUserReadingDates([], "UTC")).toEqual([]);
  });
});

describe("calculateStreak", () => {
  const now = utc(2026, 1, 10, 12, 0); // Jan 10, 2026 12:00 UTC

  it("returns BROKEN for no reading history", () => {
    const result = calculateStreak([], now, "UTC");
    expect(result).toEqual({ count: 0, status: "BROKEN" });
  });

  it("returns ACTIVE for reading today", () => {
    const dates = [
      Temporal.PlainDate.from("2026-01-10"), // today
    ];
    const result = calculateStreak(dates, now, "UTC");
    expect(result).toEqual({ count: 1, status: "ACTIVE" });
  });

  it("returns ACTIVE for consecutive streak including today", () => {
    const dates = [
      Temporal.PlainDate.from("2026-01-08"),
      Temporal.PlainDate.from("2026-01-09"),
      Temporal.PlainDate.from("2026-01-10"), // today
    ];
    const result = calculateStreak(dates, now, "UTC");
    expect(result).toEqual({ count: 3, status: "ACTIVE" });
  });

  it("returns AT_RISK when last read was yesterday and no reading today", () => {
    const dates = [
      Temporal.PlainDate.from("2026-01-09"), // yesterday
    ];
    const result = calculateStreak(dates, now, "UTC");
    expect(result).toEqual({ count: 1, status: "AT_RISK" });
  });

  it("returns AT_RISK for streak through yesterday, no reading today", () => {
    const dates = [
      Temporal.PlainDate.from("2026-01-05"),
      Temporal.PlainDate.from("2026-01-06"),
      Temporal.PlainDate.from("2026-01-07"),
      Temporal.PlainDate.from("2026-01-08"),
      Temporal.PlainDate.from("2026-01-09"), // yesterday
    ];
    const result = calculateStreak(dates, now, "UTC");
    expect(result).toEqual({ count: 5, status: "AT_RISK" });
  });

  it("returns BROKEN when yesterday was missed", () => {
    const dates = [
      Temporal.PlainDate.from("2026-01-08"),
      Temporal.PlainDate.from("2026-01-09"), // two days ago
    ];
    const result = calculateStreak(dates, now, "UTC");
    // Jan 8 and Jan 9 are consecutive -> 2-day streak ending yesterday
    // Since no reading today (Jan 10), it's AT_RISK with count 2
    expect(result).toEqual({ count: 2, status: "AT_RISK" });
  });

  it("handles DST spring forward correctly", () => {
    const dstNow = utc(2026, 3, 8, 12, 0); // March 8, 2026 (DST transition)
    const dates = [
      Temporal.PlainDate.from("2026-03-07"),
      Temporal.PlainDate.from("2026-03-08"), // today
    ];
    const result = calculateStreak(dates, dstNow, "America/New_York");
    expect(result).toEqual({ count: 2, status: "ACTIVE" });
  });

  it("handles DST fall back correctly", () => {
    const dstNow = utc(2026, 11, 1, 12, 0); // Nov 1, 2026 (DST ends)
    const dates = [
      Temporal.PlainDate.from("2026-10-31"),
      Temporal.PlainDate.from("2026-11-01"), // today
    ];
    const result = calculateStreak(dates, dstNow, "America/New_York");
    expect(result).toEqual({ count: 2, status: "ACTIVE" });
  });

  it("returns AT_RISK at 00:01 local after reading yesterday", () => {
    const midnightNow = utc(2026, 1, 10, 5, 0); // 00:00 UTC = 00:01 EST on Jan 10
    const dates = [
      Temporal.PlainDate.from("2026-01-09"), // yesterday
    ];
    const result = calculateStreak(dates, midnightNow, "America/New_York");
    expect(result).toEqual({ count: 1, status: "AT_RISK" });
  });

  it("ignores gaps in streak correctly", () => {
    const dates = [
      Temporal.PlainDate.from("2026-01-01"),
      Temporal.PlainDate.from("2026-01-02"),
      Temporal.PlainDate.from("2026-01-04"), // gap on 3rd
      Temporal.PlainDate.from("2026-01-05"),
      Temporal.PlainDate.from("2026-01-06"),
      Temporal.PlainDate.from("2026-01-07"),
      Temporal.PlainDate.from("2026-01-08"),
      Temporal.PlainDate.from("2026-01-09"),
    ];
    const result = calculateStreak(dates, now, "UTC");
    // Streak from Jan 4-9 = 6 consecutive days
    expect(result).toEqual({ count: 6, status: "AT_RISK" });
  });

  it("handles multiple sessions same day as single streak day", () => {
    const sessions = [
      session(utc(2026, 1, 10, 10, 0)),
      session(utc(2026, 1, 10, 14, 0)),
      session(utc(2026, 1, 10, 20, 0)),
    ];
    const dates = getUserReadingDates(sessions, "UTC");
    const result = calculateStreak(dates, now, "UTC");
    expect(result).toEqual({ count: 1, status: "ACTIVE" });
  });

  it("handles timezone where today is different from UTC date", () => {
    const tokyoNow = utc(2026, 1, 10, 16, 0); // 01:00 JST Jan 11
    const dates = [Temporal.PlainDate.from("2026-01-11")]; // today in JST
    const result = calculateStreak(dates, tokyoNow, "Asia/Tokyo");
    expect(result).toEqual({ count: 1, status: "ACTIVE" });
  });
});

describe("getStreakEligibility", () => {
  const now = utc(2026, 1, 10, 12, 0);
  const defaultQuietStart = "22:30";
  const defaultQuietEnd = "07:00";

  it("returns eligible=false for ACTIVE streak", () => {
    const streak = { count: 5, status: "ACTIVE" as const };
    expect(
      getStreakEligibility(
        streak,
        now,
        "UTC",
        defaultQuietStart,
        defaultQuietEnd,
      ),
    ).toEqual({
      eligible: false,
      reason: "ACTIVE",
    });
  });

  it("returns eligible=false for BROKEN streak", () => {
    const streak = { count: 0, status: "BROKEN" as const };
    expect(
      getStreakEligibility(
        streak,
        now,
        "UTC",
        defaultQuietStart,
        defaultQuietEnd,
      ),
    ).toEqual({
      eligible: false,
      reason: "BROKEN",
    });
  });

  it("returns eligible=true for AT_RISK outside quiet hours", () => {
    const streak = { count: 5, status: "AT_RISK" as const };
    const morningNow = utc(2026, 1, 10, 9, 0); // 09:00 UTC
    expect(
      getStreakEligibility(
        streak,
        morningNow,
        "UTC",
        defaultQuietStart,
        defaultQuietEnd,
      ),
    ).toEqual({
      eligible: true,
    });
  });

  it("returns eligible=false during quiet hours", () => {
    const streak = { count: 5, status: "AT_RISK" as const };
    const lateNight = utc(2026, 1, 10, 23, 0); // 23:00 UTC
    expect(
      getStreakEligibility(
        streak,
        lateNight,
        "UTC",
        defaultQuietStart,
        defaultQuietEnd,
      ),
    ).toEqual({
      eligible: false,
      reason: "QUIET_HOURS",
    });
  });

  it("handles quiet hours crossing midnight", () => {
    const streak = { count: 5, status: "AT_RISK" as const };
    const earlyMorning = utc(2026, 1, 10, 6, 0); // 06:00 UTC
    expect(
      getStreakEligibility(
        streak,
        earlyMorning,
        "UTC",
        defaultQuietStart,
        defaultQuietEnd,
      ),
    ).toEqual({
      eligible: false,
      reason: "QUIET_HOURS",
    });
  });

  it("allows eligibility when quiet hours have ended", () => {
    const streak = { count: 5, status: "AT_RISK" as const };
    const morning = utc(2026, 1, 10, 8, 0); // 08:00 UTC
    expect(
      getStreakEligibility(
        streak,
        morning,
        "UTC",
        defaultQuietStart,
        defaultQuietEnd,
      ),
    ).toEqual({
      eligible: true,
    });
  });
});
