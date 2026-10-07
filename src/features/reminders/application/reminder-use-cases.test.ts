import { describe, expect, it, vi, beforeEach } from "vitest";
import { ReminderPreference, ReminderDelivery } from "../domain";
import {
  GetReminderPreferenceUseCase,
  GetReminderSettingsUseCase,
  UpdateReminderPreferenceUseCase,
  GetReminderDeliveriesUseCase,
  ScheduleDueRemindersUseCase,
  ProcessReminderDeliveriesUseCase,
} from "./reminder-use-cases";
import { GetEffectiveReminderTimeUseCase } from "../application";
import type {
  ReminderEmailSender,
  ReminderPushSender,
} from "./reminder-use-cases";
import type {
  ReminderDispatchRepository,
  ReminderPreferenceRepository,
  ReminderDeliveryRepository,
  ReminderSchedulingRepository,
} from "../domain";

const deliverySnapshot = {
  recipientEmail: "reader@example.com",
  bookTitle: "The Pragmatic Reader",
  bookCurrentPage: 40,
  bookTotalPages: 200,
  dailyPageTarget: 15,
};

function createPreferenceRepository(): ReminderPreferenceRepository {
  return {
    findByUserId: vi.fn().mockResolvedValue(null),
    findTimezoneByUserId: vi.fn().mockResolvedValue("UTC"),
    saveSettings: vi.fn(),
  };
}

describe("GetReminderPreferenceUseCase", () => {
  let repo: ReminderPreferenceRepository;
  let useCase: GetReminderPreferenceUseCase;

  beforeEach(() => {
    repo = createPreferenceRepository();
    useCase = new GetReminderPreferenceUseCase(repo);
  });

  it("returns preference when found", async () => {
    const pref = ReminderPreference.create({
      userId: "user-1",
      enabled: true,
      reminderTime: "19:00:00",
    });
    vi.mocked(repo.findByUserId).mockResolvedValue(pref);

    const result = await useCase.execute("user-1", {});

    expect(result).toEqual(pref);
    expect(repo.findByUserId).toHaveBeenCalledWith("user-1");
  });

  it("returns null when not found", async () => {
    vi.mocked(repo.findByUserId).mockResolvedValue(null);

    const result = await useCase.execute("user-1", {});

    expect(result).toBeNull();
  });
});

describe("GetReminderSettingsUseCase", () => {
  it("returns the stored preference and timezone", async () => {
    const repo = createPreferenceRepository();
    const preference = ReminderPreference.create({
      userId: "user-1",
      enabled: true,
      reminderTime: "19:00:00",
    });
    vi.mocked(repo.findByUserId).mockResolvedValue(preference);
    vi.mocked(repo.findTimezoneByUserId).mockResolvedValue("Africa/Lagos");

    const result = await new GetReminderSettingsUseCase(repo).execute("user-1");

    expect(result).toEqual({ preference, timezone: "Africa/Lagos" });
  });
});

describe("UpdateReminderPreferenceUseCase", () => {
  let repo: ReminderPreferenceRepository;
  let useCase: UpdateReminderPreferenceUseCase;

  beforeEach(() => {
    repo = createPreferenceRepository();
    useCase = new UpdateReminderPreferenceUseCase(repo);
  });

  it("creates new preference when none exists", async () => {
    vi.mocked(repo.findByUserId).mockResolvedValue(null);

    const result = await useCase.execute("user-1", {
      enabled: true,
      reminderTime: "08:00:00",
    });

    expect(result.preference.enabled).toBe(true);
    expect(result.preference.reminderTime).toBe("08:00:00");
    expect(repo.saveSettings).toHaveBeenCalledWith(result.preference, "UTC");
  });

  it("updates existing preference enabled status", async () => {
    const pref = ReminderPreference.create({
      userId: "user-1",
      enabled: false,
      reminderTime: "19:00:00",
    });
    vi.mocked(repo.findByUserId).mockResolvedValue(pref);

    const result = await useCase.execute("user-1", { enabled: true });

    expect(result.preference.enabled).toBe(true);
    expect(result.preference.reminderTime).toBe("19:00:00");
    expect(repo.saveSettings).toHaveBeenCalled();
  });

  it("updates existing preference time", async () => {
    const pref = ReminderPreference.create({
      userId: "user-1",
      enabled: true,
      reminderTime: "19:00:00",
    });
    vi.mocked(repo.findByUserId).mockResolvedValue(pref);

    const result = await useCase.execute("user-1", {
      reminderTime: "07:30:00",
    });

    expect(result.preference.enabled).toBe(true);
    expect(result.preference.reminderTime).toBe("07:30:00");
    expect(repo.saveSettings).toHaveBeenCalled();
  });

  it("validates time format", async () => {
    vi.mocked(repo.findByUserId).mockResolvedValue(null);

    await expect(
      useCase.execute("user-1", { reminderTime: "invalid" }),
    ).rejects.toThrow();
  });

  it("saves a valid IANA timezone", async () => {
    const result = await useCase.execute("user-1", {
      timezone: "Africa/Lagos",
    });

    expect(result.timezone).toBe("Africa/Lagos");
    expect(repo.saveSettings).toHaveBeenCalledWith(
      result.preference,
      "Africa/Lagos",
    );
  });

  it("rejects raw offsets and invalid timezones", async () => {
    await expect(
      useCase.execute("user-1", { timezone: "UTC+1" }),
    ).rejects.toThrow("Timezone must be a valid IANA timezone");
    await expect(
      useCase.execute("user-1", { timezone: "Not/A_Zone" }),
    ).rejects.toThrow("Timezone must be a valid IANA timezone");
    expect(repo.saveSettings).not.toHaveBeenCalled();
  });
});

describe("GetReminderDeliveriesUseCase", () => {
  let repo: ReminderDeliveryRepository;
  let useCase: GetReminderDeliveriesUseCase;

  beforeEach(() => {
    repo = {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByUserIdAndStatus: vi.fn().mockResolvedValue([]),
    };
    useCase = new GetReminderDeliveriesUseCase(repo);
  });

  it("returns all deliveries when no status filter", async () => {
    const deliveries = [
      ReminderDelivery.create({
        id: "1",
        userId: "user-1",
        ...deliverySnapshot,
        scheduledFor: new Date("2024-01-15T19:00:00Z"),
      }),
      ReminderDelivery.create({
        id: "2",
        userId: "user-1",
        ...deliverySnapshot,
        scheduledFor: new Date("2024-01-16T19:00:00Z"),
      }),
    ];
    vi.mocked(repo.findByUserId).mockResolvedValue(deliveries);

    const result = await useCase.execute("user-1", {});

    expect(result).toHaveLength(2);
    expect(repo.findByUserId).toHaveBeenCalledWith("user-1", 50, 0);
  });

  it("returns filtered deliveries by status", async () => {
    const deliveries = [
      ReminderDelivery.reconstitute({
        id: "1",
        userId: "user-1",
        ...deliverySnapshot,
        status: "SENT",
        deliveryChannel: "EMAIL",
        notificationKind: "DAILY_REMINDER",
        scheduledFor: new Date("2024-01-15T19:00:00Z"),
        lockedAt: null,
        nextAttemptAt: null,
        sentAt: new Date("2024-01-15T19:00:05Z"),
        attemptCount: 1,
        providerMessageId: "msg-1",
        errorCode: null,
        skipReason: null,
        createdAt: new Date("2024-01-15T18:59:00Z"),
        updatedAt: new Date("2024-01-15T19:00:05Z"),
      }),
    ];
    vi.mocked(repo.findByUserIdAndStatus).mockResolvedValue(deliveries);

    const result = await useCase.execute("user-1", { status: "SENT" });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("SENT");
    expect(repo.findByUserIdAndStatus).toHaveBeenCalledWith(
      "user-1",
      "SENT",
      50,
      0,
    );
  });

  it("respects limit and offset", async () => {
    vi.mocked(repo.findByUserId).mockResolvedValue([]);

    await useCase.execute("user-1", { limit: 10, offset: 5 });

    expect(repo.findByUserId).toHaveBeenCalledWith("user-1", 10, 5);
  });

  it("validates input with Zod", async () => {
    await expect(
      useCase.execute("user-1", { limit: -1 } as never),
    ).rejects.toThrow();
  });
});

describe("ScheduleDueRemindersUseCase", () => {
  let repository: ReminderSchedulingRepository;
  let effectiveTimeUseCase: GetEffectiveReminderTimeUseCase;
  let useCase: ScheduleDueRemindersUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = {
      findEnabledCandidates: vi.fn().mockResolvedValue([]),
      createDeliveryIfAbsent: vi.fn().mockResolvedValue(true),
    };
    effectiveTimeUseCase = {
      execute: vi.fn().mockResolvedValue({
        time: "19:00:00",
        source: "MANUAL",
        sampleDays: 0,
      }),
    };
    useCase = new ScheduleDueRemindersUseCase(repository, effectiveTimeUseCase);
  });

  it("creates a due Lagos reminder at its UTC instant", async () => {
    vi.mocked(repository.findEnabledCandidates).mockResolvedValue([
      {
        userId: "user-lagos",
        ...deliverySnapshot,
        reminderTime: "19:00:00",
        timezone: "Africa/Lagos",
        enabled: true,
        streakRescueEnabled: true,
        streakRescueTime: "21:30:00",
        quietHoursStart: "22:30:00",
        quietHoursEnd: "07:00:00",
        adaptiveTimingEnabled: true,
      },
    ]);
    // Mock effective time to return the preferred time for this test
    vi.mocked(effectiveTimeUseCase.execute).mockResolvedValue({
      time: "19:00:00",
      source: "MANUAL",
      sampleDays: 0,
    });

    const result = await useCase.execute(new Date("2026-10-05T18:05:00.000Z"));

    expect(result).toEqual({ candidates: 1, due: 1, scheduled: 1 });
    expect(repository.createDeliveryIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-lagos",
        scheduledFor: new Date("2026-10-05T18:00:00.000Z"),
      }),
    );
  });

  it("does not schedule disabled, future, or stale reminders", async () => {
    vi.mocked(repository.findEnabledCandidates).mockResolvedValue([
      {
        userId: "disabled",
        ...deliverySnapshot,
        reminderTime: "19:00:00",
        timezone: "Africa/Lagos",
        enabled: false,
        streakRescueEnabled: true,
        streakRescueTime: "21:30:00",
        quietHoursStart: "22:30:00",
        quietHoursEnd: "07:00:00",
        adaptiveTimingEnabled: true,
      },
      {
        userId: "future",
        ...deliverySnapshot,
        reminderTime: "19:10:00",
        timezone: "Africa/Lagos",
        enabled: true,
        streakRescueEnabled: true,
        streakRescueTime: "21:30:00",
        quietHoursStart: "22:30:00",
        quietHoursEnd: "07:00:00",
        adaptiveTimingEnabled: true,
      },
      {
        userId: "stale",
        ...deliverySnapshot,
        reminderTime: "18:49:00",
        timezone: "Africa/Lagos",
        enabled: true,
        streakRescueEnabled: true,
        streakRescueTime: "21:30:00",
        quietHoursEnd: "07:00:00",
        quietHoursStart: "22:30:00",
        adaptiveTimingEnabled: true,
      },
    ]);
    // Use a mock implementation that returns different times based on userId
    vi.mocked(effectiveTimeUseCase.execute).mockImplementation(
      async (userId: string) => {
        if (userId === "future") {
          return { time: "19:10:00", source: "MANUAL", sampleDays: 0 };
        }
        if (userId === "stale") {
          return { time: "18:49:00", source: "MANUAL", sampleDays: 0 };
        }
        return { time: "19:00:00", source: "MANUAL", sampleDays: 0 };
      },
    );

    const result = await useCase.execute(new Date("2026-10-05T18:05:00.000Z"));

    expect(result).toEqual({ candidates: 3, due: 0, scheduled: 0 });
    expect(repository.createDeliveryIfAbsent).not.toHaveBeenCalled();
  });

  it("uses the local calendar date near midnight", async () => {
    vi.mocked(repository.findEnabledCandidates).mockResolvedValue([
      {
        userId: "user-lagos",
        ...deliverySnapshot,
        reminderTime: "00:00:00",
        timezone: "Africa/Lagos",
        enabled: true,
        streakRescueEnabled: true,
        streakRescueTime: "21:30:00",
        quietHoursStart: "22:30:00",
        quietHoursEnd: "07:00:00",
        adaptiveTimingEnabled: true,
      },
    ]);
    // Mock effective time to return the preferred time
    vi.mocked(effectiveTimeUseCase.execute).mockResolvedValue({
      time: "00:00:00",
      source: "MANUAL",
      sampleDays: 0,
    });

    await useCase.execute(new Date("2026-10-04T23:05:00.000Z"));

    expect(repository.createDeliveryIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledFor: new Date("2026-10-04T23:00:00.000Z"),
      }),
    );
  });

  it("counts only the atomic insert on duplicate execution", async () => {
    const insertedOccurrences = new Set<string>();
    vi.mocked(repository.findEnabledCandidates).mockResolvedValue([
      {
        userId: "user-lagos",
        ...deliverySnapshot,
        reminderTime: "19:00:00",
        timezone: "Africa/Lagos",
        enabled: true,
        streakRescueEnabled: true,
        streakRescueTime: "21:30:00",
        quietHoursStart: "22:30:00",
        quietHoursEnd: "07:00:00",
        adaptiveTimingEnabled: true,
      },
    ]);
    vi.mocked(repository.createDeliveryIfAbsent).mockImplementation(
      async (delivery) => {
        const key = `${delivery.userId}:${delivery.scheduledFor.toISOString()}`;
        if (insertedOccurrences.has(key)) return false;
        insertedOccurrences.add(key);
        return true;
      },
    );
    const now = new Date("2026-10-05T18:05:00.000Z");

    const first = await useCase.execute(now);
    const second = await useCase.execute(now);

    expect(first.scheduled).toBe(1);
    expect(second.scheduled).toBe(0);
    expect(insertedOccurrences.size).toBe(1);
  });
});

describe("ProcessReminderDeliveriesUseCase", () => {
  const now = new Date("2026-10-04T23:30:00.000Z");
  let dispatchRepo: ReminderDispatchRepository;
  let emailSender: ReminderEmailSender;
  let pushSender: ReminderPushSender;
  let useCase: ProcessReminderDeliveriesUseCase;

  function claimedDelivery(userId = "user-1", attemptCount = 0) {
    const delivery = ReminderDelivery.create({
      id: `delivery-${userId}`,
      userId,
      ...deliverySnapshot,
      scheduledFor: new Date("2026-10-04T23:00:00.000Z"),
    });
    if (attemptCount === 0) return delivery.markProcessing(now);

    return ReminderDelivery.reconstitute({
      ...delivery.toPersistence(),
      status: "FAILED",
      deliveryChannel: "EMAIL",
      attemptCount,
      nextAttemptAt: now,
      errorCode: "RESEND_TIMEOUT",
    }).markProcessing(now);
  }

  beforeEach(() => {
    dispatchRepo = {
      recoverStaleClaims: vi.fn().mockResolvedValue(0),
      claimDueDeliveries: vi.fn().mockResolvedValue([claimedDelivery()]),
      findEligibility: vi.fn().mockResolvedValue({
        timezone: "Africa/Lagos",
        remindersEnabled: true,
        emailEnabled: true,
        streakRescueEnabled: true,
        quietHoursStart: "22:30:00",
        quietHoursEnd: "07:00:00",
        hasActiveBook: true,
      }),
      hasReadingSessionBetween: vi.fn().mockResolvedValue(false),
      selectChannel: vi.fn().mockResolvedValue(true),
      fallbackToEmail: vi.fn().mockResolvedValue(true),
      saveClaimResult: vi.fn().mockResolvedValue(true),
    };
    emailSender = {
      sendReminder: vi.fn().mockResolvedValue({
        status: "ACCEPTED",
        providerMessageId: "msg-123",
      }),
    };
    pushSender = {
      hasActiveSubscription: vi.fn().mockResolvedValue(false),
      sendReminder: vi.fn(),
    };
    const streakService = {
      getStreak: vi.fn().mockResolvedValue({ count: 0, status: "BROKEN" }),
    };
    useCase = new ProcessReminderDeliveriesUseCase(
      dispatchRepo,
      emailSender,
      pushSender,
      streakService,
    );
  });

  it("recovers stale claims and atomically claims a bounded batch", async () => {
    vi.mocked(dispatchRepo.recoverStaleClaims).mockResolvedValue(2);

    const result = await useCase.execute(now, 25);

    expect(dispatchRepo.recoverStaleClaims).toHaveBeenCalledWith(
      new Date("2026-10-04T23:20:00.000Z"),
      now,
    );
    expect(dispatchRepo.claimDueDeliveries).toHaveBeenCalledWith(now, 25, 3);
    expect(result.recovered).toBe(2);
    expect(result.claimed).toBe(1);
  });

  it("sends one eligible claimed delivery", async () => {
    const result = await useCase.execute(now);

    expect(result.sent).toBe(1);
    expect(result.retryScheduled).toBe(0);
    expect(result.terminalFailed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(emailSender.sendReminder).toHaveBeenCalledWith({
      deliveryId: "delivery-user-1",
      ...deliverySnapshot,
      scheduledFor: new Date("2026-10-04T23:00:00.000Z"),
    });
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptCount: 1,
        status: "SENT",
        nextAttemptAt: null,
        sentAt: now,
        providerMessageId: "msg-123",
        errorCode: null,
      }),
      now,
    );
  });

  it("skips with REMINDERS_DISABLED before calling the provider", async () => {
    vi.mocked(dispatchRepo.claimDueDeliveries).mockResolvedValue([
      claimedDelivery("user-1", 1),
    ]);
    vi.mocked(dispatchRepo.findEligibility).mockResolvedValue({
      timezone: "Africa/Lagos",
      remindersEnabled: false,
      emailEnabled: true,
      streakRescueEnabled: true,
      quietHoursStart: "22:30:00",
      quietHoursEnd: "07:00:00",
      hasActiveBook: true,
    });

    const result = await useCase.execute(now);

    expect(result.skipped).toBe(1);
    expect(emailSender.sendReminder).not.toHaveBeenCalled();
    expect(dispatchRepo.hasReadingSessionBetween).not.toHaveBeenCalled();
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptCount: 1,
        status: "SKIPPED",
        skipReason: "REMINDERS_DISABLED",
      }),
      now,
    );
  });

  it("skips when the user already read during their local day", async () => {
    vi.mocked(dispatchRepo.claimDueDeliveries).mockResolvedValue([
      claimedDelivery("user-1", 1),
    ]);
    vi.mocked(dispatchRepo.hasReadingSessionBetween).mockResolvedValue(true);

    const result = await useCase.execute(now);

    expect(result.skipped).toBe(1);
    expect(dispatchRepo.hasReadingSessionBetween).toHaveBeenCalledWith(
      "user-1",
      new Date("2026-10-04T23:00:00.000Z"),
      new Date("2026-10-05T23:00:00.000Z"),
    );
    expect(emailSender.sendReminder).not.toHaveBeenCalled();
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptCount: 1,
        skipReason: "ALREADY_READ_TODAY",
      }),
      now,
    );
  });

  it("skips when the user has no active reading book", async () => {
    vi.mocked(dispatchRepo.claimDueDeliveries).mockResolvedValue([
      claimedDelivery("user-1", 1),
    ]);
    vi.mocked(dispatchRepo.findEligibility).mockResolvedValue({
      timezone: "Africa/Lagos",
      remindersEnabled: true,
      emailEnabled: true,
      streakRescueEnabled: true,
      quietHoursStart: "22:30:00",
      quietHoursEnd: "07:00:00",
      hasActiveBook: false,
    });

    const result = await useCase.execute(now);

    expect(result.skipped).toBe(1);
    expect(emailSender.sendReminder).not.toHaveBeenCalled();
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptCount: 1,
        skipReason: "NO_ACTIVE_BOOK",
      }),
      now,
    );
  });

  it("schedules a five-minute retry after the first transient failure", async () => {
    vi.mocked(emailSender.sendReminder).mockResolvedValue({
      status: "FAILED",
      classification: "RETRYABLE",
      errorCode: "RESEND_RATE_LIMIT",
    });

    const result = await useCase.execute(now);

    expect(result.retryScheduled).toBe(1);
    expect(result.terminalFailed).toBe(0);
    expect(result.sent).toBe(0);
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptCount: 1,
        status: "FAILED",
        nextAttemptAt: new Date("2026-10-04T23:35:00.000Z"),
        errorCode: "RESEND_RATE_LIMIT",
      }),
      now,
    );
  });

  it("schedules a thirty-minute retry after the second transient failure", async () => {
    vi.mocked(dispatchRepo.claimDueDeliveries).mockResolvedValue([
      claimedDelivery("user-1", 1),
    ]);
    vi.mocked(emailSender.sendReminder).mockResolvedValue({
      status: "FAILED",
      classification: "RETRYABLE",
      errorCode: "RESEND_TIMEOUT",
    });

    const result = await useCase.execute(now);

    expect(result.retryScheduled).toBe(1);
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptCount: 2,
        nextAttemptAt: new Date("2026-10-05T00:00:00.000Z"),
      }),
      now,
    );
  });

  it("makes the third transient failure terminal", async () => {
    vi.mocked(dispatchRepo.claimDueDeliveries).mockResolvedValue([
      claimedDelivery("user-1", 2),
    ]);
    vi.mocked(emailSender.sendReminder).mockResolvedValue({
      status: "FAILED",
      classification: "RETRYABLE",
      errorCode: "RESEND_SERVER_ERROR",
    });

    const result = await useCase.execute(now);

    expect(result.retryScheduled).toBe(0);
    expect(result.terminalFailed).toBe(1);
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({ attemptCount: 3, nextAttemptAt: null }),
      now,
    );
  });

  it("makes a permanent first failure terminal", async () => {
    vi.mocked(emailSender.sendReminder).mockResolvedValue({
      status: "FAILED",
      classification: "PERMANENT",
      errorCode: "PROVIDER_AUTH_ERROR",
    });

    const result = await useCase.execute(now);

    expect(result.terminalFailed).toBe(1);
    expect(result.retryScheduled).toBe(0);
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({ attemptCount: 1, nextAttemptAt: null }),
      now,
    );
  });

  it("does not increment attempts when claim-result ownership was lost", async () => {
    vi.mocked(dispatchRepo.saveClaimResult).mockResolvedValue(false);

    const result = await useCase.execute(now);

    expect(result.unresolved).toBe(1);
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({ attemptCount: 1 }),
      now,
    );
  });

  it("reuses the same delivery identity when provider acceptance was not persisted", async () => {
    vi.mocked(dispatchRepo.saveClaimResult)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const first = await useCase.execute(now);
    const second = await useCase.execute(now);

    expect(first.unresolved).toBe(1);
    expect(second.sent).toBe(1);
    expect(emailSender.sendReminder).toHaveBeenCalledTimes(2);
    expect(vi.mocked(emailSender.sendReminder).mock.calls[1]).toEqual(
      vi.mocked(emailSender.sendReminder).mock.calls[0],
    );
    expect(
      vi.mocked(emailSender.sendReminder).mock.calls[0][0].deliveryId,
    ).toBe("delivery-user-1");
  });

  it("selects PUSH for an eligible user with an active subscription", async () => {
    vi.mocked(pushSender.hasActiveSubscription).mockResolvedValue(true);
    vi.mocked(pushSender.sendReminder).mockResolvedValue({
      status: "ACCEPTED",
      providerMessageId: "web-push/delivery-user-1",
      attempted: 2,
      accepted: 1,
      invalidated: 1,
    });

    const result = await useCase.execute(now);

    expect(dispatchRepo.selectChannel).toHaveBeenCalledWith(
      "delivery-user-1",
      now,
      "PUSH",
      now,
    );
    expect(pushSender.sendReminder).toHaveBeenCalledWith(
      "user-1",
      "delivery-user-1",
    );
    expect(emailSender.sendReminder).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ sentPush: 1, sentEmail: 0, pushSelected: 1 }),
    );
  });

  it("uses PUSH when email is disabled", async () => {
    vi.mocked(dispatchRepo.findEligibility).mockResolvedValue({
      timezone: "Africa/Lagos",
      remindersEnabled: true,
      emailEnabled: false,
      streakRescueEnabled: true,
      quietHoursStart: "22:30:00",
      quietHoursEnd: "07:00:00",
      hasActiveBook: true,
    });
    vi.mocked(pushSender.hasActiveSubscription).mockResolvedValue(true);
    vi.mocked(pushSender.sendReminder).mockResolvedValue({
      status: "ACCEPTED",
      providerMessageId: "web-push/delivery-user-1",
      attempted: 1,
      accepted: 1,
      invalidated: 0,
    });

    const result = await useCase.execute(now);

    expect(result.sentPush).toBe(1);
    expect(emailSender.sendReminder).not.toHaveBeenCalled();
  });

  it("skips without a provider call when no channel is enabled", async () => {
    vi.mocked(dispatchRepo.findEligibility).mockResolvedValue({
      timezone: "Africa/Lagos",
      remindersEnabled: true,
      emailEnabled: false,
      streakRescueEnabled: true,
      quietHoursStart: "22:30:00",
      quietHoursEnd: "07:00:00",
      hasActiveBook: true,
    });

    const result = await useCase.execute(now);

    expect(result.skipped).toBe(1);
    expect(emailSender.sendReminder).not.toHaveBeenCalled();
    expect(pushSender.sendReminder).not.toHaveBeenCalled();
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptCount: 0,
        status: "SKIPPED",
        skipReason: "NO_ENABLED_CHANNEL",
      }),
      now,
    );
  });

  it("falls back to EMAIL when newly selected push targets are all gone", async () => {
    vi.mocked(pushSender.hasActiveSubscription).mockResolvedValue(true);
    vi.mocked(pushSender.sendReminder).mockResolvedValue({
      status: "NO_ACTIVE_SUBSCRIPTIONS",
      attempted: 2,
      invalidated: 2,
    });

    const result = await useCase.execute(now);

    expect(dispatchRepo.fallbackToEmail).toHaveBeenCalledWith(
      "delivery-user-1",
      now,
      now,
    );
    expect(emailSender.sendReminder).toHaveBeenCalledOnce();
    expect(result).toEqual(
      expect.objectContaining({
        sentPush: 0,
        sentEmail: 1,
        pushFallbackToEmail: 1,
      }),
    );
  });

  it("keeps a persisted PUSH channel on temporary failure retries", async () => {
    const retry = ReminderDelivery.reconstitute({
      ...claimedDelivery().toPersistence(),
      status: "FAILED",
      deliveryChannel: "PUSH",
      lockedAt: null,
      attemptCount: 1,
      nextAttemptAt: now,
      errorCode: "PUSH_TEMPORARY_FAILURE",
    }).markProcessing(now);
    vi.mocked(dispatchRepo.claimDueDeliveries).mockResolvedValue([retry]);
    vi.mocked(pushSender.sendReminder).mockResolvedValue({
      status: "FAILED",
      classification: "RETRYABLE",
      errorCode: "PUSH_TEMPORARY_FAILURE",
      attempted: 1,
      invalidated: 0,
    });

    const result = await useCase.execute(now);

    expect(pushSender.hasActiveSubscription).not.toHaveBeenCalled();
    expect(dispatchRepo.selectChannel).not.toHaveBeenCalled();
    expect(emailSender.sendReminder).not.toHaveBeenCalled();
    expect(result.retryScheduled).toBe(1);
    expect(dispatchRepo.saveClaimResult).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryChannel: "PUSH",
        attemptCount: 2,
      }),
      now,
    );
  });

  it("does not switch a persisted PUSH channel to email after an uncertain prior attempt", async () => {
    const retry = ReminderDelivery.reconstitute({
      ...claimedDelivery().toPersistence(),
      status: "FAILED",
      deliveryChannel: "PUSH",
      lockedAt: null,
      attemptCount: 1,
      nextAttemptAt: now,
      errorCode: "PUSH_TEMPORARY_FAILURE",
    }).markProcessing(now);
    vi.mocked(dispatchRepo.claimDueDeliveries).mockResolvedValue([retry]);
    vi.mocked(pushSender.sendReminder).mockResolvedValue({
      status: "NO_ACTIVE_SUBSCRIPTIONS",
      attempted: 0,
      invalidated: 0,
    });

    const result = await useCase.execute(now);

    expect(dispatchRepo.fallbackToEmail).not.toHaveBeenCalled();
    expect(emailSender.sendReminder).not.toHaveBeenCalled();
    expect(result.terminalFailed).toBe(1);
  });
});
