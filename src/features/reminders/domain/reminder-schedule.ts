import { Temporal } from "@js-temporal/polyfill";

export function getReminderOccurrence(
  now: Date,
  reminderTime: string,
  timezone: string,
): Date {
  const [hour, minute, second] = reminderTime.split(":").map(Number);
  const localNow = Temporal.Instant.fromEpochMilliseconds(
    now.getTime(),
  ).toZonedDateTimeISO(timezone);
  const occurrence = Temporal.ZonedDateTime.from(
    {
      timeZone: timezone,
      year: localNow.year,
      month: localNow.month,
      day: localNow.day,
      hour,
      minute,
      second,
    },
    { disambiguation: "compatible" },
  );

  return new Date(occurrence.epochMilliseconds);
}

export function getLocalDayBounds(
  now: Date,
  timezone: string,
): { start: Date; end: Date } {
  const localNow = Temporal.Instant.fromEpochMilliseconds(
    now.getTime(),
  ).toZonedDateTimeISO(timezone);
  const start = localNow.startOfDay();
  const end = start.add({ days: 1 });

  return {
    start: new Date(start.epochMilliseconds),
    end: new Date(end.epochMilliseconds),
  };
}
