import { Temporal } from "@js-temporal/polyfill";

export type StreakStatus = "ACTIVE" | "AT_RISK" | "BROKEN";

export interface StreakState {
  count: number;
  status: StreakStatus;
}

export type ReadingStreakResult = StreakState;

export interface ReadingDate {
  date: Temporal.PlainDate;
}

export function getUserReadingDates(
  sessions: Array<{ readAt: Date }>,
  timezone: string,
): Temporal.PlainDate[] {
  const dateSet = new Set<string>();

  for (const session of sessions) {
    const instant = Temporal.Instant.fromEpochMilliseconds(
      session.readAt.getTime(),
    );
    const zoned = instant.toZonedDateTimeISO(timezone);
    const plainDate = zoned.toPlainDate();
    dateSet.add(plainDate.toString());
  }

  return Array.from(dateSet)
    .map((s) => Temporal.PlainDate.from(s))
    .sort((a, b) => Temporal.PlainDate.compare(a, b));
}

export function calculateStreak(
  readingDates: Temporal.PlainDate[],
  now: Date,
  timezone: string,
): StreakState {
  if (readingDates.length === 0) {
    return { count: 0, status: "BROKEN" };
  }

  const localNow = Temporal.Instant.fromEpochMilliseconds(
    now.getTime(),
  ).toZonedDateTimeISO(timezone);
  const today = localNow.toPlainDate();

  const uniqueDates = [...new Set(readingDates.map((d) => d.toString()))]
    .map((s) => Temporal.PlainDate.from(s))
    .sort((a, b) => Temporal.PlainDate.compare(a, b));

  const lastDate = uniqueDates[uniqueDates.length - 1];

  if (Temporal.PlainDate.compare(lastDate, today) === 0) {
    let count = 1;
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const expectedPrevious = uniqueDates[i + 1].subtract({ days: 1 });
      if (Temporal.PlainDate.compare(uniqueDates[i], expectedPrevious) === 0) {
        count++;
      } else {
        break;
      }
    }
    return { count, status: "ACTIVE" };
  }

  const yesterday = today.subtract({ days: 1 });
  if (Temporal.PlainDate.compare(lastDate, yesterday) === 0) {
    let count = 1;
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const expectedPrevious = uniqueDates[i + 1].subtract({ days: 1 });
      if (Temporal.PlainDate.compare(uniqueDates[i], expectedPrevious) === 0) {
        count++;
      } else {
        break;
      }
    }
    return { count, status: "AT_RISK" };
  }

  return { count: 0, status: "BROKEN" };
}

export function getStreakEligibility(
  streak: StreakState,
  now: Date,
  timezone: string,
  quietHoursStart: string,
  quietHoursEnd: string,
): { eligible: boolean; reason?: string } {
  if (streak.status !== "AT_RISK") {
    return {
      eligible: false,
      reason: streak.status === "ACTIVE" ? "ACTIVE" : "BROKEN",
    };
  }

  if (streak.count === 0) {
    return { eligible: false, reason: "BROKEN" };
  }

  const localNow = Temporal.Instant.fromEpochMilliseconds(
    now.getTime(),
  ).toZonedDateTimeISO(timezone);
  const [startHour, startMinute] = quietHoursStart.split(":").map(Number);
  const [endHour, endMinute] = quietHoursEnd.split(":").map(Number);

  const currentTime = localNow.toPlainTime();
  const quietStart = Temporal.PlainTime.from({
    hour: startHour,
    minute: startMinute,
  });
  const quietEnd = Temporal.PlainTime.from({
    hour: endHour,
    minute: endMinute,
  });

  let inQuietHours = false;
  if (Temporal.PlainTime.compare(quietStart, quietEnd) < 0) {
    inQuietHours =
      Temporal.PlainTime.compare(currentTime, quietStart) >= 0 &&
      Temporal.PlainTime.compare(currentTime, quietEnd) < 0;
  } else {
    inQuietHours =
      Temporal.PlainTime.compare(currentTime, quietStart) >= 0 ||
      Temporal.PlainTime.compare(currentTime, quietEnd) < 0;
  }

  if (inQuietHours) {
    return { eligible: false, reason: "QUIET_HOURS" };
  }

  return { eligible: true };
}
