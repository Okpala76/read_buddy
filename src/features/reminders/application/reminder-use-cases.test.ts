import { describe, expect, it, vi, beforeEach } from "vitest";
import { ReminderPreference, ReminderDelivery } from "../domain";
import {
  GetReminderPreferenceUseCase,
  UpdateReminderPreferenceUseCase,
  GetReminderDeliveriesUseCase,
  ScheduleReminderDeliveryUseCase,
  ProcessReminderDeliveriesUseCase,
  RetryFailedDeliveriesUseCase,
} from "./reminder-use-cases";
import type {
  ReminderPreferenceRepository,
  ReminderDeliveryRepository,
} from "../domain";

describe("GetReminderPreferenceUseCase", () => {
  let repo: ReminderPreferenceRepository;
  let useCase: GetReminderPreferenceUseCase;

  beforeEach(() => {
    repo = {
      findByUserId: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    };
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

describe("UpdateReminderPreferenceUseCase", () => {
  let repo: ReminderPreferenceRepository;
  let useCase: UpdateReminderPreferenceUseCase;

  beforeEach(() => {
    repo = {
      findByUserId: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    };
    useCase = new UpdateReminderPreferenceUseCase(repo);
  });

  it("creates new preference when none exists", async () => {
    vi.mocked(repo.findByUserId).mockResolvedValue(null);

    const result = await useCase.execute("user-1", {
      enabled: true,
      reminderTime: "08:00:00",
    });

    expect(result.enabled).toBe(true);
    expect(result.reminderTime).toBe("08:00:00");
    expect(repo.save).toHaveBeenCalled();
  });

  it("updates existing preference enabled status", async () => {
    const pref = ReminderPreference.create({
      userId: "user-1",
      enabled: false,
      reminderTime: "19:00:00",
    });
    vi.mocked(repo.findByUserId).mockResolvedValue(pref);

    const result = await useCase.execute("user-1", { enabled: true });

    expect(result.enabled).toBe(true);
    expect(result.reminderTime).toBe("19:00:00");
    expect(repo.save).toHaveBeenCalled();
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

    expect(result.enabled).toBe(true);
    expect(result.reminderTime).toBe("07:30:00");
    expect(repo.save).toHaveBeenCalled();
  });

  it("validates time format", async () => {
    vi.mocked(repo.findByUserId).mockResolvedValue(null);

    await expect(
      useCase.execute("user-1", { reminderTime: "invalid" }),
    ).rejects.toThrow();
  });
});

describe("GetReminderDeliveriesUseCase", () => {
  let repo: ReminderDeliveryRepository;
  let useCase: GetReminderDeliveriesUseCase;

  beforeEach(() => {
    repo = {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByStatus: vi.fn().mockResolvedValue([]),
      findByUserIdAndScheduledFor: vi.fn().mockResolvedValue(null),
      findPendingByScheduledBefore: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      saveMany: vi.fn(),
    };
    useCase = new GetReminderDeliveriesUseCase(repo);
  });

  it("returns all deliveries when no status filter", async () => {
    const deliveries = [
      ReminderDelivery.create({
        id: "1",
        userId: "user-1",
        scheduledFor: new Date("2024-01-15T19:00:00Z"),
      }),
      ReminderDelivery.create({
        id: "2",
        userId: "user-1",
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
        status: "SENT",
        scheduledFor: new Date("2024-01-15T19:00:00Z"),
        sentAt: new Date("2024-01-15T19:00:05Z"),
        attemptCount: 1,
        providerMessageId: "msg-1",
        errorCode: null,
        createdAt: new Date("2024-01-15T18:59:00Z"),
        updatedAt: new Date("2024-01-15T19:00:05Z"),
      }),
    ];
    vi.mocked(repo.findByStatus).mockResolvedValue(deliveries);

    const result = await useCase.execute("user-1", { status: "SENT" });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("SENT");
    expect(repo.findByStatus).toHaveBeenCalledWith("SENT", 50, 0);
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

describe("ScheduleReminderDeliveryUseCase", () => {
  let deliveryRepo: ReminderDeliveryRepository;
  let prefRepo: ReminderPreferenceRepository;
  let useCase: ScheduleReminderDeliveryUseCase;

  beforeEach(() => {
    deliveryRepo = {
      findByUserIdAndScheduledFor: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      findByUserId: vi.fn().mockResolvedValue([]),
      findPendingByScheduledBefore: vi.fn().mockResolvedValue([]),
      findByStatus: vi.fn().mockResolvedValue([]),
      saveMany: vi.fn(),
    };
    prefRepo = {
      findByUserId: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    };
    useCase = new ScheduleReminderDeliveryUseCase(deliveryRepo, prefRepo);
  });

  it("creates new delivery when none exists", async () => {
    const scheduledFor = new Date("2024-01-15T19:00:00Z");
    vi.mocked(deliveryRepo.findByUserIdAndScheduledFor).mockResolvedValue(null);

    const result = await useCase.execute("user-1", scheduledFor);

    expect(result.userId).toBe("user-1");
    expect(result.scheduledFor).toEqual(scheduledFor);
    expect(result.status).toBe("PENDING");
    expect(deliveryRepo.save).toHaveBeenCalled();
  });

  it("returns existing delivery when found", async () => {
    const scheduledFor = new Date("2024-01-15T19:00:00Z");
    const existing = ReminderDelivery.create({
      id: "existing-1",
      userId: "user-1",
      scheduledFor,
    });
    vi.mocked(deliveryRepo.findByUserIdAndScheduledFor).mockResolvedValue(
      existing,
    );

    const result = await useCase.execute("user-1", scheduledFor);

    expect(result).toEqual(existing);
    expect(deliveryRepo.save).not.toHaveBeenCalled();
  });
});

describe("ProcessReminderDeliveriesUseCase", () => {
  let deliveryRepo: ReminderDeliveryRepository;
  let prefRepo: ReminderPreferenceRepository;
  let sendEmail: (
    userId: string,
    delivery: { id: string; scheduledFor: Date },
  ) => Promise<{ messageId: string }>;
  let useCase: ProcessReminderDeliveriesUseCase;

  beforeEach(() => {
    deliveryRepo = {
      findPendingByScheduledBefore: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      findByUserIdAndScheduledFor: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      findByStatus: vi.fn().mockResolvedValue([]),
      saveMany: vi.fn(),
    };
    prefRepo = {
      findByUserId: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    };
    sendEmail = vi
      .fn<
        (
          userId: string,
          delivery: { id: string; scheduledFor: Date },
        ) => Promise<{
          messageId: string;
        }>
      >()
      .mockResolvedValue({ messageId: "msg-123" });
    useCase = new ProcessReminderDeliveriesUseCase(
      deliveryRepo,
      prefRepo,
      sendEmail,
    );
  });

  it("processes pending deliveries and sends emails", async () => {
    const delivery = ReminderDelivery.create({
      id: "1",
      userId: "user-1",
      scheduledFor: new Date("2024-01-15T19:00:00Z"),
    });
    vi.mocked(deliveryRepo.findPendingByScheduledBefore).mockResolvedValue([
      delivery,
    ]);
    vi.mocked(prefRepo.findByUserId).mockResolvedValue(
      ReminderPreference.create({
        userId: "user-1",
        enabled: true,
        reminderTime: "19:00:00",
      }),
    );

    const result = await useCase.execute(new Date("2024-01-15T20:00:00Z"), 10);

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(sendEmail).toHaveBeenCalledWith("user-1", {
      id: "1",
      scheduledFor: delivery.scheduledFor,
    });
    expect(deliveryRepo.save).toHaveBeenCalled();
  });

  it("skips delivery when preference is disabled", async () => {
    const delivery = ReminderDelivery.create({
      id: "1",
      userId: "user-1",
      scheduledFor: new Date("2024-01-15T19:00:00Z"),
    });
    vi.mocked(deliveryRepo.findPendingByScheduledBefore).mockResolvedValue([
      delivery,
    ]);
    vi.mocked(prefRepo.findByUserId).mockResolvedValue(
      ReminderPreference.create({
        userId: "user-1",
        enabled: false,
        reminderTime: "19:00:00",
      }),
    );

    const result = await useCase.execute(new Date("2024-01-15T20:00:00Z"), 10);

    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips delivery when preference not found", async () => {
    const delivery = ReminderDelivery.create({
      id: "1",
      userId: "user-1",
      scheduledFor: new Date("2024-01-15T19:00:00Z"),
    });
    vi.mocked(deliveryRepo.findPendingByScheduledBefore).mockResolvedValue([
      delivery,
    ]);
    vi.mocked(prefRepo.findByUserId).mockResolvedValue(null);

    const result = await useCase.execute(new Date("2024-01-15T20:00:00Z"), 10);

    expect(result.skipped).toBe(1);
  });

  it("marks delivery as failed when email fails", async () => {
    const delivery = ReminderDelivery.create({
      id: "1",
      userId: "user-1",
      scheduledFor: new Date("2024-01-15T19:00:00Z"),
    });
    vi.mocked(deliveryRepo.findPendingByScheduledBefore).mockResolvedValue([
      delivery,
    ]);
    vi.mocked(prefRepo.findByUserId).mockResolvedValue(
      ReminderPreference.create({
        userId: "user-1",
        enabled: true,
        reminderTime: "19:00:00",
      }),
    );
    vi.mocked(sendEmail).mockRejectedValue(new Error("RATE_LIMITED"));

    const result = await useCase.execute(new Date("2024-01-15T20:00:00Z"), 10);

    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
  });

  it("respects batch size limit", async () => {
    const deliveries = Array.from({ length: 150 }, (_, i) =>
      ReminderDelivery.create({
        id: String(i),
        userId: "user-1",
        scheduledFor: new Date("2024-01-15T19:00:00Z"),
      }),
    );
    // Mock to return only first 100 when batchSize is 100
    vi.mocked(deliveryRepo.findPendingByScheduledBefore).mockImplementation(
      async (_scheduledBefore: Date, limit: number) =>
        deliveries.slice(0, limit),
    );
    vi.mocked(prefRepo.findByUserId).mockResolvedValue(
      ReminderPreference.create({
        userId: "user-1",
        enabled: true,
        reminderTime: "19:00:00",
      }),
    );

    const result = await useCase.execute(new Date("2024-01-15T20:00:00Z"), 100);

    expect(result.processed).toBe(100);
  });
});

describe("RetryFailedDeliveriesUseCase", () => {
  let deliveryRepo: ReminderDeliveryRepository;
  let sendEmail: (
    userId: string,
    delivery: { id: string; scheduledFor: Date },
  ) => Promise<{ messageId: string }>;
  let useCase: RetryFailedDeliveriesUseCase;

  beforeEach(() => {
    deliveryRepo = {
      findByStatus: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      findByUserIdAndScheduledFor: vi.fn().mockResolvedValue(null),
      findPendingByScheduledBefore: vi.fn().mockResolvedValue([]),
      findByUserId: vi.fn().mockResolvedValue([]),
      saveMany: vi.fn(),
    };
    sendEmail = vi
      .fn<
        (
          userId: string,
          delivery: { id: string; scheduledFor: Date },
        ) => Promise<{
          messageId: string;
        }>
      >()
      .mockResolvedValue({ messageId: "msg-retry-1" });
    useCase = new RetryFailedDeliveriesUseCase(deliveryRepo, sendEmail);
  });

  it("retries failed deliveries under max attempts", async () => {
    const failedDelivery = ReminderDelivery.reconstitute({
      id: "1",
      userId: "user-1",
      status: "FAILED",
      scheduledFor: new Date("2024-01-15T19:00:00Z"),
      sentAt: null,
      attemptCount: 1,
      providerMessageId: null,
      errorCode: "RATE_LIMITED",
      createdAt: new Date("2024-01-15T18:59:00Z"),
      updatedAt: new Date("2024-01-15T19:00:05Z"),
    });
    vi.mocked(deliveryRepo.findByStatus).mockResolvedValue([failedDelivery]);

    const result = await useCase.execute(3);

    expect(result.retried).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("does not retry deliveries at max attempts", async () => {
    const failedDelivery = ReminderDelivery.reconstitute({
      id: "1",
      userId: "user-1",
      status: "FAILED",
      scheduledFor: new Date("2024-01-15T19:00:00Z"),
      sentAt: null,
      attemptCount: 3,
      providerMessageId: null,
      errorCode: "RATE_LIMITED",
      createdAt: new Date("2024-01-15T18:59:00Z"),
      updatedAt: new Date("2024-01-15T19:00:05Z"),
    });
    vi.mocked(deliveryRepo.findByStatus).mockResolvedValue([failedDelivery]);

    const result = await useCase.execute(3);

    expect(result.retried).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("marks as failed when retry fails", async () => {
    const failedDelivery = ReminderDelivery.reconstitute({
      id: "1",
      userId: "user-1",
      status: "FAILED",
      scheduledFor: new Date("2024-01-15T19:00:00Z"),
      sentAt: null,
      attemptCount: 1,
      providerMessageId: null,
      errorCode: "RATE_LIMITED",
      createdAt: new Date("2024-01-15T18:59:00Z"),
      updatedAt: new Date("2024-01-15T19:00:05Z"),
    });
    vi.mocked(deliveryRepo.findByStatus).mockResolvedValue([failedDelivery]);
    vi.mocked(sendEmail).mockRejectedValue(new Error("TIMEOUT"));

    const result = await useCase.execute(3);

    expect(result.retried).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });
});
