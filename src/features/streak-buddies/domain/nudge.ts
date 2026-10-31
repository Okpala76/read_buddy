/** Day keys are based on each member's own timezone, not the server timezone. */
export function localDayKey(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
