import { describe, expect, it } from "vitest";

import { NotificationDecisionEngine } from "./notification-decision";

const eligible = {
  remindersEnabled: true,
  emailEnabled: true,
  alreadyReadToday: false,
  hasActiveBook: true,
  pushAvailable: false,
  selectedChannel: null,
  notificationKind: "DAILY_REMINDER" as const,
  streakRescueEnabled: true,
  streakStatus: "AT_RISK" as const,
  inQuietHours: false,
} as const;

describe("NotificationDecisionEngine", () => {
  const engine = new NotificationDecisionEngine();

  it.each([
    {
      name: "already read today",
      input: { ...eligible, alreadyReadToday: true, pushAvailable: true },
      expected: { action: "SKIP", reason: "ALREADY_READ_TODAY" },
    },
    {
      name: "no active book",
      input: { ...eligible, hasActiveBook: false },
      expected: { action: "SKIP", reason: "NO_ACTIVE_BOOK" },
    },
    {
      name: "master reminders disabled",
      input: { ...eligible, remindersEnabled: false, pushAvailable: true },
      expected: { action: "SKIP", reason: "REMINDERS_DISABLED" },
    },
    {
      name: "push and email active",
      input: { ...eligible, pushAvailable: true },
      expected: { action: "PUSH", reason: "PUSH_SELECTED" },
    },
    {
      name: "push unavailable and email active",
      input: eligible,
      expected: {
        action: "EMAIL",
        reason: "PUSH_UNAVAILABLE_EMAIL_FALLBACK",
      },
    },
    {
      name: "push unsubscribed and email active",
      input: { ...eligible, pushAvailable: false },
      expected: {
        action: "EMAIL",
        reason: "PUSH_UNAVAILABLE_EMAIL_FALLBACK",
      },
    },
    {
      name: "push active and email disabled",
      input: { ...eligible, pushAvailable: true, emailEnabled: false },
      expected: { action: "PUSH", reason: "PUSH_SELECTED" },
    },
    {
      name: "no usable channel",
      input: { ...eligible, emailEnabled: false },
      expected: { action: "SKIP", reason: "NO_ENABLED_CHANNEL" },
    },
    {
      name: "all push subscriptions expired before selection",
      input: { ...eligible, pushAvailable: false },
      expected: {
        action: "EMAIL",
        reason: "PUSH_UNAVAILABLE_EMAIL_FALLBACK",
      },
    },
  ])("decides $name", ({ input, expected }) => {
    expect(engine.decide(input)).toEqual(expected);
  });

  it("keeps a persisted PUSH choice on retry when push availability changes", () => {
    expect(
      engine.decide({
        ...eligible,
        pushAvailable: false,
        selectedChannel: "PUSH",
      }),
    ).toEqual({ action: "PUSH", reason: "PUSH_SELECTED" });
  });

  it("keeps a persisted EMAIL choice when push later becomes available", () => {
    expect(
      engine.decide({
        ...eligible,
        pushAvailable: true,
        selectedChannel: "EMAIL",
      }),
    ).toEqual({ action: "EMAIL", reason: "EMAIL_SELECTED" });
  });

  it("skips STREAK_RESCUE when streak is ACTIVE", () => {
    expect(
      engine.decide({
        ...eligible,
        notificationKind: "STREAK_RESCUE",
        streakStatus: "ACTIVE",
      }),
    ).toEqual({ action: "SKIP", reason: "ALREADY_READ_TODAY" });
  });

  it("skips STREAK_RESCUE when streak is BROKEN", () => {
    expect(
      engine.decide({
        ...eligible,
        notificationKind: "STREAK_RESCUE",
        streakStatus: "BROKEN",
      }),
    ).toEqual({ action: "SKIP", reason: "STREAK_BROKEN" });
  });

  it("skips STREAK_RESCUE when streak rescue is disabled", () => {
    expect(
      engine.decide({
        ...eligible,
        notificationKind: "STREAK_RESCUE",
        streakStatus: "AT_RISK",
        streakRescueEnabled: false,
      }),
    ).toEqual({ action: "SKIP", reason: "REMINDERS_DISABLED" });
  });

  it("skips STREAK_RESCUE during quiet hours", () => {
    expect(
      engine.decide({
        ...eligible,
        notificationKind: "STREAK_RESCUE",
        streakStatus: "AT_RISK",
        inQuietHours: true,
      }),
    ).toEqual({ action: "SKIP", reason: "QUIET_HOURS" });
  });

  it("selects PUSH for STREAK_RESCUE when push available", () => {
    expect(
      engine.decide({
        ...eligible,
        notificationKind: "STREAK_RESCUE",
        streakStatus: "AT_RISK",
        pushAvailable: true,
      }),
    ).toEqual({ action: "PUSH", reason: "PUSH_SELECTED" });
  });

  it("falls back to EMAIL for STREAK_RESCUE when push unavailable", () => {
    expect(
      engine.decide({
        ...eligible,
        notificationKind: "STREAK_RESCUE",
        streakStatus: "AT_RISK",
        pushAvailable: false,
      }),
    ).toEqual({ action: "EMAIL", reason: "PUSH_UNAVAILABLE_EMAIL_FALLBACK" });
  });
});
