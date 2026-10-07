import { Temporal } from "@js-temporal/polyfill";

export const ADAPTIVE_HISTORY_DAYS = 35;
export const MIN_ADAPTIVE_SAMPLE_DAYS = 7;
export const ADAPTIVE_REMINDER_LEAD_MINUTES = 30;
export const MIN_WEEKDAY_SAMPLES = 5;
export const MIN_WEEKEND_SAMPLES = 4;

export type AdaptiveTimeSource =
  | "MANUAL"
  | "INSUFFICIENT_HISTORY"
  | "OVERALL_ADAPTIVE"
  | "WEEKDAY_ADAPTIVE"
  | "WEEKEND_ADAPTIVE";

export interface ReadingBehaviorProfile {
  userId: string;
  sampleDays: number;
  typicalReadingMinute: number;
  weekdaySampleDays: number;
  weekdayTypicalMinute: number | null;
  weekendSampleDays: number;
  weekendTypicalMinute: number | null;
  windowStart: Date;
  computedAt: Date;
}

export interface EffectiveReminderTimeResult {
  time: string;
  source: AdaptiveTimeSource;
  sampleDays: number;
}

export interface FirstReadingOfDay {
  date: Temporal.PlainDate;
  minuteOfDay: number;
  isWeekend: boolean;
}

export function getFirstReadingOfDay(
  sessions: Array<{ readAt: Date }>,
  timezone: string,
): FirstReadingOfDay[] {
  const dayMap = new Map<string, { minute: number; isWeekend: boolean }>();

  for (const session of sessions) {
    const instant = Temporal.Instant.fromEpochMilliseconds(
      session.readAt.getTime(),
    );
    const zoned = instant.toZonedDateTimeISO(timezone);
    const plainDate = zoned.toPlainDate();
    const dateKey = plainDate.toString();
    const minuteOfDay = zoned.hour * 60 + zoned.minute;
    const isWeekend = zoned.dayOfWeek === 6 || zoned.dayOfWeek === 7;

    const existing = dayMap.get(dateKey);
    if (!existing || minuteOfDay < existing.minute) {
      dayMap.set(dateKey, { minute: minuteOfDay, isWeekend });
    }
  }

  return Array.from(dayMap.entries())
    .map(([dateKey, { minute, isWeekend }]) => ({
      date: Temporal.PlainDate.from(dateKey),
      minuteOfDay: minute,
      isWeekend,
    }))
    .sort((a, b) => Temporal.PlainDate.compare(a.date, b.date));
}

export function calculateMedian(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function minutesToTimeString(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = Math.round(minutes % 60);
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}:00`;
}

export function timeStringToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function roundToNearestFiveMinutes(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

export function clampReminderTime(
  minutes: number,
  quietHoursStart: string,
  quietHoursEnd: string,
  streakRescueTime: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _timezone: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _now: Date,
): number {
  const [quietStartHour, quietStartMinute] = quietHoursStart
    .split(":")
    .map(Number);
  const [quietEndHour, quietEndMinute] = quietHoursEnd.split(":").map(Number);
  const [rescueHour, rescueMinute] = streakRescueTime.split(":").map(Number);

  const quietStartMinutes = quietStartHour * 60 + quietStartMinute;
  const quietEndMinutes = quietEndHour * 60 + quietEndMinute;
  const rescueMinutes = rescueHour * 60 + rescueMinute;

  const latestAllowed = Math.min(quietStartMinutes - 1, rescueMinutes - 60);

  let clamped = minutes;

  if (clamped < quietEndMinutes) {
    clamped = quietEndMinutes;
  }

  if (clamped > latestAllowed) {
    clamped = latestAllowed;
  }

  return clamped;
}

export function computeBehaviorProfile(
  sessions: Array<{ readAt: Date }>,
  timezone: string,
  now: Date,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _quietHoursStart: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _quietHoursEnd: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _streakRescueTime: string,
): ReadingBehaviorProfile {
  const cutoff = Temporal.Instant.fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(timezone)
    .subtract({ days: ADAPTIVE_HISTORY_DAYS })
    .startOfDay()
    .toInstant();

  const recentSessions = sessions.filter(
    (s) => Temporal.Instant.fromEpochMilliseconds(s.readAt.getTime()) >= cutoff,
  );

  const firstReadings = getFirstReadingOfDay(recentSessions, timezone);

  const overallMinutes = firstReadings.map((r) => r.minuteOfDay);
  const typicalReadingMinute = calculateMedian(overallMinutes) ?? 0;

  const weekdayReadings = firstReadings.filter((r) => !r.isWeekend);
  const weekendReadings = firstReadings.filter((r) => r.isWeekend);

  const weekdayMinutes = weekdayReadings.map((r) => r.minuteOfDay);
  const weekendMinutes = weekendReadings.map((r) => r.minuteOfDay);

  const weekdayTypicalMinute =
    weekdayMinutes.length >= MIN_WEEKDAY_SAMPLES
      ? calculateMedian(weekdayMinutes)
      : null;
  const weekendTypicalMinute =
    weekendMinutes.length >= MIN_WEEKEND_SAMPLES
      ? calculateMedian(weekendMinutes)
      : null;

  const firstReadingDate = firstReadings[0]?.date;
  const windowStart = firstReadingDate
    ? new Date(
        Temporal.PlainDate.from(firstReadingDate)
          .toZonedDateTime(timezone)
          .startOfDay()
          .toInstant().epochMilliseconds,
      )
    : now;

  return {
    userId: "",
    sampleDays: firstReadings.length,
    typicalReadingMinute: roundToNearestFiveMinutes(typicalReadingMinute),
    weekdaySampleDays: weekdayReadings.length,
    weekdayTypicalMinute:
      weekdayTypicalMinute !== null
        ? roundToNearestFiveMinutes(weekdayTypicalMinute)
        : null,
    weekendSampleDays: weekendReadings.length,
    weekendTypicalMinute:
      weekendTypicalMinute !== null
        ? roundToNearestFiveMinutes(weekendTypicalMinute)
        : null,
    windowStart,
    computedAt: now,
  };
}

export function computeEffectiveReminderTime(
  profile: ReadingBehaviorProfile,
  preference: {
    adaptiveTimingEnabled: boolean;
    reminderTime: string;
    quietHoursStart: string;
    quietHoursEnd: string;
    streakRescueTime: string;
  },
  timezone: string,
  now: Date,
): EffectiveReminderTimeResult {
  if (!preference.adaptiveTimingEnabled) {
    return {
      time: preference.reminderTime,
      source: "MANUAL",
      sampleDays: profile.sampleDays,
    };
  }

  if (profile.sampleDays < MIN_ADAPTIVE_SAMPLE_DAYS) {
    return {
      time: preference.reminderTime,
      source: "INSUFFICIENT_HISTORY",
      sampleDays: profile.sampleDays,
    };
  }

  const localNow = Temporal.Instant.fromEpochMilliseconds(
    now.getTime(),
  ).toZonedDateTimeISO(timezone);
  const today = localNow.toPlainDate();
  const isWeekend = today.dayOfWeek === 6 || today.dayOfWeek === 7;

  let effectiveMinutes: number;
  let source: AdaptiveTimeSource;

  if (isWeekend && profile.weekendSampleDays >= MIN_WEEKEND_SAMPLES) {
    effectiveMinutes =
      (profile.weekendTypicalMinute ?? profile.typicalReadingMinute) -
      ADAPTIVE_REMINDER_LEAD_MINUTES;
    source = "WEEKEND_ADAPTIVE";
  } else if (!isWeekend && profile.weekdaySampleDays >= MIN_WEEKDAY_SAMPLES) {
    effectiveMinutes =
      (profile.weekdayTypicalMinute ?? profile.typicalReadingMinute) -
      ADAPTIVE_REMINDER_LEAD_MINUTES;
    source = "WEEKDAY_ADAPTIVE";
  } else {
    effectiveMinutes =
      profile.typicalReadingMinute - ADAPTIVE_REMINDER_LEAD_MINUTES;
    source = "OVERALL_ADAPTIVE";
  }

  effectiveMinutes = roundToNearestFiveMinutes(effectiveMinutes);

  const clamped = clampReminderTime(
    effectiveMinutes,
    preference.quietHoursStart,
    preference.quietHoursEnd,
    preference.streakRescueTime,
    timezone,
    new Date(),
  );

  return {
    time: minutesToTimeString(clamped),
    source,
    sampleDays: profile.sampleDays,
  };
}
