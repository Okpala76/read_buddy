import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cronMocks = vi.hoisted(() => ({
  scheduleExecute: vi.fn(),
  processExecute: vi.fn(),
}));

vi.mock("@/config/env", () => ({
  config: { CRON_SECRET: "test-cron-secret" },
  env: {
    DATABASE_URL: "postgresql://dummy:dummy@localhost:5432/dummy",
    DATABASE_SSL: "require",
    DATABASE_POOL_MAX: 10,
    NODE_ENV: "test",
    RESEND_API_KEY: undefined,
    RESEND_FROM_EMAIL: undefined,
    CRON_SECRET: "test-cron-secret",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
    VAPID_PRIVATE_KEY: undefined,
    VAPID_SUBJECT: undefined,
  },
}));

vi.mock("@/features/reminders/infrastructure", () => ({
  DrizzleReminderDispatchRepository: class {},
  DrizzleReminderSchedulingRepository: class {},
  DrizzleReminderStreakRepository: class {},
  ResendEmailService: class {},
}));

vi.mock("@/features/reminders/application", () => ({
  ScheduleDueRemindersUseCase: class {
    execute = cronMocks.scheduleExecute;
  },
  ProcessReminderDeliveriesUseCase: class {
    execute = cronMocks.processExecute;
  },
  ReadingStreakService: class {},
}));

vi.mock("@/features/push-notifications/infrastructure", () => ({
  ScheduledPushNotificationService: class {},
}));

import { GET } from "./route";

describe("GET /api/cron/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cronMocks.scheduleExecute.mockResolvedValue({
      candidates: 2,
      due: 1,
      scheduled: 1,
    });
    cronMocks.processExecute.mockResolvedValue({
      recovered: 1,
      claimed: 1,
      sent: 1,
      skipped: 0,
      retryScheduled: 0,
      terminalFailed: 0,
      unresolved: 0,
    });
  });

  it("rejects an unauthorized request before scheduling", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/reminders"),
    );

    expect(response.status).toBe(401);
    expect(cronMocks.scheduleExecute).not.toHaveBeenCalled();
    expect(cronMocks.processExecute).not.toHaveBeenCalled();
  });

  it("schedules due reminders before claiming and dispatching", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/reminders", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        success: true,
        candidates: 2,
        due: 1,
        scheduled: 1,
        recovered: 1,
        claimed: 1,
        sent: 1,
      }),
    );
    expect(cronMocks.scheduleExecute).toHaveBeenCalledOnce();
    expect(cronMocks.processExecute).toHaveBeenCalledOnce();
    expect(cronMocks.scheduleExecute.mock.invocationCallOrder[0]).toBeLessThan(
      cronMocks.processExecute.mock.invocationCallOrder[0],
    );
  });
});
