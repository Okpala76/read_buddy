import { Temporal } from "@js-temporal/polyfill";

/** Distinct local reading dates determine milestones; repeated sessions do not. */
export function reachedMilestone(
  readDates: Date[],
  timezone: string,
  readAt: Date,
) {
  const day = (date: Date) =>
    Temporal.Instant.fromEpochMilliseconds(date.getTime())
      .toZonedDateTimeISO(timezone)
      .toPlainDate();
  const today = day(readAt);
  const dates = new Set(readDates.map((d) => day(d).toString()));
  let cursor = today;
  let days = 0;
  while (dates.has(cursor.toString())) {
    days++;
    cursor = cursor.subtract({ days: 1 });
  }
  return [10, 50, 100].includes(days)
    ? { days, localDay: today.toString() }
    : null;
}
