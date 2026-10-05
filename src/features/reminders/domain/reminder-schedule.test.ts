import { describe, expect, it } from "vitest";

import {
  getLocalDayBounds,
  getReminderOccurrence,
  isValidIanaTimezone,
} from "./index";

describe("reminder timezone handling", () => {
  it("converts Lagos local time to the correct UTC instant", () => {
    const occurrence = getReminderOccurrence(
      new Date("2026-10-05T12:00:00.000Z"),
      "19:00:00",
      "Africa/Lagos",
    );

    expect(occurrence.toISOString()).toBe("2026-10-05T18:00:00.000Z");
  });

  it("converts Toronto local time to the correct UTC instant", () => {
    const occurrence = getReminderOccurrence(
      new Date("2026-10-05T12:00:00.000Z"),
      "19:00:00",
      "America/Toronto",
    );

    expect(occurrence.toISOString()).toBe("2026-10-05T23:00:00.000Z");
  });

  it("gives different UTC instants to equal wall-clock times in different zones", () => {
    const now = new Date("2026-10-05T12:00:00.000Z");
    const lagos = getReminderOccurrence(now, "19:00:00", "Africa/Lagos");
    const toronto = getReminderOccurrence(now, "19:00:00", "America/Toronto");

    expect(lagos.toISOString()).toBe("2026-10-05T18:00:00.000Z");
    expect(toronto.toISOString()).toBe("2026-10-05T23:00:00.000Z");
  });

  it("uses the user's local date near local midnight", () => {
    const occurrence = getReminderOccurrence(
      new Date("2026-10-04T23:05:00.000Z"),
      "00:00:00",
      "Africa/Lagos",
    );

    expect(occurrence.toISOString()).toBe("2026-10-04T23:00:00.000Z");
  });

  it("returns UTC bounds for the user's Lagos calendar day", () => {
    const bounds = getLocalDayBounds(
      new Date("2026-10-04T23:30:00.000Z"),
      "Africa/Lagos",
    );

    expect(bounds.start.toISOString()).toBe("2026-10-04T23:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-10-05T23:00:00.000Z");
  });

  it("uses DST-aware day boundaries instead of assuming 24 hours", () => {
    const bounds = getLocalDayBounds(
      new Date("2026-03-08T12:00:00.000Z"),
      "America/New_York",
    );

    expect(bounds.start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });

  it("moves a nonexistent spring-forward time forward by the DST gap", () => {
    const occurrence = getReminderOccurrence(
      new Date("2026-03-08T07:35:00.000Z"),
      "02:30:00",
      "America/New_York",
    );

    expect(occurrence.toISOString()).toBe("2026-03-08T07:30:00.000Z");
  });

  it("chooses the earlier instant for an ambiguous fall-back time", () => {
    const occurrence = getReminderOccurrence(
      new Date("2026-11-01T05:35:00.000Z"),
      "01:30:00",
      "America/New_York",
    );

    expect(occurrence.toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });

  it("accepts IANA zones and rejects raw offsets", () => {
    expect(isValidIanaTimezone("Africa/Lagos")).toBe(true);
    expect(isValidIanaTimezone("America/Toronto")).toBe(true);
    expect(isValidIanaTimezone("UTC")).toBe(true);
    expect(isValidIanaTimezone("UTC+1")).toBe(false);
    expect(isValidIanaTimezone("GMT-5")).toBe(false);
    expect(isValidIanaTimezone("Not/A_Zone")).toBe(false);
  });
});
