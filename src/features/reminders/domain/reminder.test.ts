import { describe, expect, it } from "vitest";
import {
  ReminderPreference,
  ReminderDelivery,
  ReminderDeliveryStatus,
} from "./reminder";

describe("ReminderPreference domain", () => {
  describe("create", () => {
    it("creates a preference with valid time format", () => {
      const pref = ReminderPreference.create({
        userId: "user-1",
        enabled: true,
        reminderTime: "19:00:00",
      });

      expect(pref.userId).toBe("user-1");
      expect(pref.enabled).toBe(true);
      expect(pref.reminderTime).toBe("19:00:00");
      expect(pref.emailEnabled).toBe(true);
      expect(pref.streakRescueEnabled).toBe(true);
      expect(pref.streakRescueTime).toBe("21:30:00");
      expect(pref.quietHoursStart).toBe("22:30:00");
      expect(pref.quietHoursEnd).toBe("07:00:00");
      expect(pref.createdAt).toBeInstanceOf(Date);
      expect(pref.updatedAt).toBeInstanceOf(Date);
    });

    it("creates a preference with default disabled", () => {
      const pref = ReminderPreference.create({
        userId: "user-1",
        enabled: false,
        reminderTime: "08:30:00",
      });

      expect(pref.enabled).toBe(false);
      expect(pref.streakRescueEnabled).toBe(true);
    });

    it("throws on invalid time format (missing seconds)", () => {
      expect(() =>
        ReminderPreference.create({
          userId: "user-1",
          enabled: true,
          reminderTime: "19:00",
        }),
      ).toThrow("Reminder time must be in HH:MM:SS format");
    });

    it("throws on invalid time format (invalid hour)", () => {
      expect(() =>
        ReminderPreference.create({
          userId: "user-1",
          enabled: true,
          reminderTime: "25:00:00",
        }),
      ).toThrow("Reminder time must be in HH:MM:SS format");
    });

    it("throws on invalid time format (invalid minute)", () => {
      expect(() =>
        ReminderPreference.create({
          userId: "user-1",
          enabled: true,
          reminderTime: "19:60:00",
        }),
      ).toThrow("Reminder time must be in HH:MM:SS format");
    });
  });

  describe("reconstitute", () => {
    it("reconstitutes from persistence props", () => {
      const props = {
        userId: "user-1",
        enabled: true,
        emailEnabled: true,
        reminderTime: "19:00:00",
        streakRescueEnabled: true,
        streakRescueTime: "21:30:00",
        quietHoursStart: "22:30:00",
        quietHoursEnd: "07:00:00",
        createdAt: new Date("2024-01-15T10:00:00Z"),
        updatedAt: new Date("2024-01-15T10:00:00Z"),
      };

      const pref = ReminderPreference.reconstitute(props);

      expect(pref.userId).toBe("user-1");
      expect(pref.enabled).toBe(true);
      expect(pref.reminderTime).toBe("19:00:00");
      expect(pref.streakRescueEnabled).toBe(true);
      expect(pref.streakRescueTime).toBe("21:30:00");
      expect(pref.quietHoursStart).toBe("22:30:00");
      expect(pref.quietHoursEnd).toBe("07:00:00");
    });
  });

  describe("enable/disable", () => {
    it("enables a disabled preference", () => {
      const pref = ReminderPreference.create({
        userId: "user-1",
        enabled: false,
        reminderTime: "19:00:00",
      });

      const enabled = pref.enable();

      expect(enabled.enabled).toBe(true);
      expect(enabled.updatedAt.getTime()).toBeGreaterThanOrEqual(
        pref.updatedAt.getTime(),
      );
    });

    it("disables an enabled preference", () => {
      const pref = ReminderPreference.create({
        userId: "user-1",
        enabled: true,
        emailEnabled: true,
        reminderTime: "19:00:00",
      });

      const disabled = pref.disable();

      expect(disabled.enabled).toBe(false);
    });
  });

  describe("updateTime", () => {
    it("updates the reminder time", () => {
      const pref = ReminderPreference.create({
        userId: "user-1",
        enabled: true,
        reminderTime: "19:00:00",
      });

      const updated = pref.updateTime("07:30:00");

      expect(updated.reminderTime).toBe("07:30:00");
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        pref.updatedAt.getTime(),
      );
    });

    it("throws on invalid time format", () => {
      const pref = ReminderPreference.create({
        userId: "user-1",
        enabled: true,
        reminderTime: "19:00:00",
      });

      expect(() => pref.updateTime("invalid")).toThrow(
        "Reminder time must be in HH:MM:SS format",
      );
    });
  });

  describe("toPersistence", () => {
    it("returns a copy of props", () => {
      const pref = ReminderPreference.create({
        userId: "user-1",
        enabled: true,
        reminderTime: "19:00:00",
      });

      const props = pref.toPersistence();

      expect(props).toEqual({
        userId: "user-1",
        enabled: true,
        emailEnabled: true,
        reminderTime: "19:00:00",
        streakRescueEnabled: true,
        streakRescueTime: "21:30:00",
        quietHoursStart: "22:30:00",
        quietHoursEnd: "07:00:00",
        createdAt: pref.createdAt,
        updatedAt: pref.updatedAt,
      });
    });
  });
});

describe("ReminderDelivery domain", () => {
  const claimedAt = new Date("2024-01-15T19:00:00Z");
  const baseProps = {
    id: "delivery-1",
    userId: "user-1",
    recipientEmail: "reader@example.com",
    bookTitle: "The Pragmatic Reader",
    bookCurrentPage: 40,
    bookTotalPages: 200,
    dailyPageTarget: 15,
    scheduledFor: new Date("2024-01-15T19:00:00Z"),
  };

  describe("create", () => {
    it("creates a pending delivery", () => {
      const delivery = ReminderDelivery.create(baseProps);

      expect(delivery.id).toBe("delivery-1");
      expect(delivery.userId).toBe("user-1");
      expect(delivery.status).toBe("PENDING");
      expect(delivery.notificationKind).toBe("DAILY_REMINDER");
      expect(delivery.scheduledFor).toEqual(baseProps.scheduledFor);
      expect(delivery.lockedAt).toBeNull();
      expect(delivery.nextAttemptAt).toBeNull();
      expect(delivery.sentAt).toBeNull();
      expect(delivery.attemptCount).toBe(0);
      expect(delivery.providerMessageId).toBeNull();
      expect(delivery.errorCode).toBeNull();
      expect(delivery.skipReason).toBeNull();
      expect(delivery.createdAt).toBeInstanceOf(Date);
      expect(delivery.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("reconstitute", () => {
    it("reconstitutes from persistence props", () => {
      const props = {
        ...baseProps,
        status: "SENT" as const,
        deliveryChannel: "EMAIL" as const,
        notificationKind: "DAILY_REMINDER" as const,
        lockedAt: null,
        nextAttemptAt: null,
        sentAt: new Date("2024-01-15T19:00:05Z"),
        attemptCount: 1,
        providerMessageId: "msg-123",
        errorCode: null,
        skipReason: null,
        createdAt: new Date("2024-01-15T18:59:00Z"),
        updatedAt: new Date("2024-01-15T19:00:05Z"),
      };

      const delivery = ReminderDelivery.reconstitute(props);

      expect(delivery.id).toBe("delivery-1");
      expect(delivery.status).toBe("SENT");
      expect(delivery.notificationKind).toBe("DAILY_REMINDER");
      expect(delivery.sentAt).toEqual(props.sentAt);
      expect(delivery.attemptCount).toBe(1);
      expect(delivery.providerMessageId).toBe("msg-123");
    });
  });

  describe("markProcessing", () => {
    it("claims a pending delivery without incrementing attempts", () => {
      const delivery = ReminderDelivery.create(baseProps);

      const claimed = delivery.markProcessing(claimedAt);

      expect(claimed.status).toBe("PROCESSING");
      expect(claimed.lockedAt).toEqual(claimedAt);
      expect(claimed.attemptCount).toBe(0);
    });

    it("does not allow a terminal delivery to be reclaimed", () => {
      const sent = ReminderDelivery.create(baseProps)
        .markProcessing(claimedAt)
        .markSent("msg-123");

      expect(() => sent.markProcessing(new Date())).toThrow(
        "Cannot claim reminder delivery from SENT",
      );
    });
  });

  describe("markSent", () => {
    it("marks delivery as sent with provider message ID", () => {
      const delivery =
        ReminderDelivery.create(baseProps).markProcessing(claimedAt);

      const sent = delivery.markSent("msg-123");

      expect(sent.status).toBe("SENT");
      expect(sent.lockedAt).toBeNull();
      expect(sent.sentAt).toBeInstanceOf(Date);
      expect(sent.attemptCount).toBe(1);
      expect(sent.providerMessageId).toBe("msg-123");
      expect(sent.updatedAt.getTime()).toBeGreaterThanOrEqual(
        delivery.updatedAt.getTime(),
      );
    });

    it("counts a successful retry after a failed attempt", () => {
      const delivery = ReminderDelivery.reconstitute({
        ...ReminderDelivery.create(baseProps).toPersistence(),
        status: "PROCESSING",
        lockedAt: claimedAt,
        attemptCount: 1,
        errorCode: "TIMEOUT",
      });

      const sent = delivery.markSent("msg-123");

      expect(sent.status).toBe("SENT");
      expect(sent.attemptCount).toBe(2);
    });
  });

  describe("markFailed", () => {
    it("marks delivery as failed with error code and increments attempt count", () => {
      const delivery =
        ReminderDelivery.create(baseProps).markProcessing(claimedAt);

      const nextAttemptAt = new Date("2024-01-15T19:05:00Z");
      const failed = delivery.markFailed("RATE_LIMITED", nextAttemptAt);

      expect(failed.status).toBe("FAILED");
      expect(failed.lockedAt).toBeNull();
      expect(failed.attemptCount).toBe(1);
      expect(failed.errorCode).toBe("RATE_LIMITED");
      expect(failed.nextAttemptAt).toEqual(nextAttemptAt);
      expect(failed.updatedAt.getTime()).toBeGreaterThanOrEqual(
        delivery.updatedAt.getTime(),
      );
    });

    it("increments attempt count on multiple failures", () => {
      const delivery = ReminderDelivery.reconstitute({
        ...ReminderDelivery.create(baseProps).toPersistence(),
        status: "PROCESSING",
        lockedAt: claimedAt,
        attemptCount: 1,
        errorCode: "RATE_LIMITED",
      });
      const failed2 = delivery.markFailed("TIMEOUT", null);

      expect(failed2.attemptCount).toBe(2);
    });
  });

  describe("markSkipped", () => {
    it("marks delivery as skipped", () => {
      const delivery =
        ReminderDelivery.create(baseProps).markProcessing(claimedAt);

      const skipped = delivery.markSkipped("REMINDERS_DISABLED");

      expect(skipped.status).toBe("SKIPPED");
      expect(skipped.lockedAt).toBeNull();
      expect(skipped.attemptCount).toBe(0);
      expect(skipped.skipReason).toBe("REMINDERS_DISABLED");
      expect(skipped.updatedAt.getTime()).toBeGreaterThanOrEqual(
        delivery.updatedAt.getTime(),
      );
    });
  });

  describe("recoverClaim", () => {
    it("releases a processing claim without incrementing attempts", () => {
      const claimed =
        ReminderDelivery.create(baseProps).markProcessing(claimedAt);

      const recovered = claimed.recoverClaim();

      expect(recovered.status).toBe("PENDING");
      expect(recovered.lockedAt).toBeNull();
      expect(recovered.attemptCount).toBe(0);
    });

    it("restores a retry claim to failed", () => {
      const retryAt = new Date("2024-01-15T19:05:00Z");
      const claimedRetry = ReminderDelivery.reconstitute({
        ...ReminderDelivery.create(baseProps).toPersistence(),
        status: "FAILED",
        attemptCount: 1,
        nextAttemptAt: retryAt,
        errorCode: "RESEND_TIMEOUT",
      }).markProcessing(retryAt);

      expect(claimedRetry.recoverClaim().status).toBe("FAILED");
    });
  });

  describe("transition guards", () => {
    it("does not send, fail, or skip an unclaimed delivery", () => {
      const pending = ReminderDelivery.create(baseProps);

      expect(() => pending.markSent("msg")).toThrow(
        "Cannot mark as sent reminder delivery from PENDING",
      );
      expect(() => pending.markFailed("TIMEOUT", null)).toThrow(
        "Cannot mark as failed reminder delivery from PENDING",
      );
      expect(() => pending.markSkipped("NO_ACTIVE_BOOK")).toThrow(
        "Cannot mark as skipped reminder delivery from PENDING",
      );
    });
  });

  describe("toPersistence", () => {
    it("returns a copy of props", () => {
      const delivery = ReminderDelivery.create(baseProps);

      const props = delivery.toPersistence();

      expect(props).toEqual({
        id: "delivery-1",
        userId: "user-1",
        recipientEmail: "reader@example.com",
        bookTitle: "The Pragmatic Reader",
        bookCurrentPage: 40,
        bookTotalPages: 200,
        dailyPageTarget: 15,
        status: "PENDING",
        deliveryChannel: null,
        notificationKind: "DAILY_REMINDER",
        scheduledFor: baseProps.scheduledFor,
        lockedAt: null,
        nextAttemptAt: null,
        sentAt: null,
        attemptCount: 0,
        providerMessageId: null,
        errorCode: null,
        skipReason: null,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
      });
    });
  });
});

describe("ReminderDeliveryStatus enum", () => {
  it("has all expected values", () => {
    expect(ReminderDeliveryStatus.PENDING).toBe("PENDING");
    expect(ReminderDeliveryStatus.PROCESSING).toBe("PROCESSING");
    expect(ReminderDeliveryStatus.SENT).toBe("SENT");
    expect(ReminderDeliveryStatus.FAILED).toBe("FAILED");
    expect(ReminderDeliveryStatus.SKIPPED).toBe("SKIPPED");
  });
});
