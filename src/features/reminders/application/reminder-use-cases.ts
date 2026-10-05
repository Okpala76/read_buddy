import { z } from "zod";
import {
  getReminderOccurrence,
  getLocalDayBounds,
  isValidIanaTimezone,
  normalizeIanaTimezone,
  ReminderPreference,
  ReminderDelivery,
  type ReminderPreferenceRepository,
  type ReminderDeliveryRepository,
  type ReminderDispatchRepository,
  type ReminderSchedulingRepository,
} from "../domain";

export const getReminderPreferenceInputSchema = z.object({});

export type GetReminderPreferenceInput = z.infer<
  typeof getReminderPreferenceInputSchema
>;

export const ianaTimezoneSchema = z
  .string()
  .trim()
  .refine(isValidIanaTimezone, "Timezone must be a valid IANA timezone")
  .transform(normalizeIanaTimezone);

export const updateReminderPreferenceInputSchema = z.object({
  enabled: z.boolean().optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .optional(),
  timezone: ianaTimezoneSchema.optional(),
});

export type UpdateReminderPreferenceInput = z.infer<
  typeof updateReminderPreferenceInputSchema
>;

export const getReminderDeliveriesInputSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  status: z
    .enum(["PENDING", "PROCESSING", "SENT", "FAILED", "SKIPPED"])
    .optional(),
});

export type GetReminderDeliveriesInput = z.infer<
  typeof getReminderDeliveriesInputSchema
>;

export class GetReminderPreferenceUseCase {
  constructor(
    private readonly preferenceRepository: ReminderPreferenceRepository,
  ) {}

  async execute(
    userId: string,
    input: GetReminderPreferenceInput = {},
  ): Promise<ReminderPreference | null> {
    getReminderPreferenceInputSchema.parse(input);
    return this.preferenceRepository.findByUserId(userId);
  }
}

export class GetReminderSettingsUseCase {
  constructor(
    private readonly preferenceRepository: ReminderPreferenceRepository,
  ) {}

  async execute(userId: string): Promise<{
    preference: ReminderPreference | null;
    timezone: string;
  }> {
    const [preference, timezone] = await Promise.all([
      this.preferenceRepository.findByUserId(userId),
      this.preferenceRepository.findTimezoneByUserId(userId),
    ]);

    return { preference, timezone };
  }
}

export class UpdateReminderPreferenceUseCase {
  constructor(
    private readonly preferenceRepository: ReminderPreferenceRepository,
  ) {}

  async execute(
    userId: string,
    input: UpdateReminderPreferenceInput,
  ): Promise<{ preference: ReminderPreference; timezone: string }> {
    const parsed = updateReminderPreferenceInputSchema.parse(input);

    const [storedPreference, storedTimezone] = await Promise.all([
      this.preferenceRepository.findByUserId(userId),
      this.preferenceRepository.findTimezoneByUserId(userId),
    ]);
    let preference = storedPreference;

    if (!preference) {
      preference = ReminderPreference.create({
        userId,
        enabled: parsed.enabled ?? false,
        reminderTime: parsed.reminderTime ?? "19:00:00",
      });
    } else {
      if (parsed.enabled !== undefined) {
        preference = parsed.enabled
          ? preference.enable()
          : preference.disable();
      }
      if (parsed.reminderTime !== undefined) {
        preference = preference.updateTime(parsed.reminderTime);
      }
    }

    const timezone = parsed.timezone ?? storedTimezone;
    await this.preferenceRepository.saveSettings(preference, timezone);
    return { preference, timezone };
  }
}

export class GetReminderDeliveriesUseCase {
  constructor(
    private readonly deliveryRepository: ReminderDeliveryRepository,
  ) {}

  async execute(
    userId: string,
    input: GetReminderDeliveriesInput = {},
  ): Promise<ReminderDelivery[]> {
    const parsed = getReminderDeliveriesInputSchema.parse(input);
    const { limit = 50, offset = 0, status } = parsed;

    if (status) {
      return this.deliveryRepository.findByUserIdAndStatus(
        userId,
        status,
        limit,
        offset,
      );
    }

    return this.deliveryRepository.findByUserId(userId, limit, offset);
  }
}

export const REMINDER_SCHEDULING_GRACE_PERIOD_MS = 15 * 60 * 1000;
export const REMINDER_DISPATCH_BATCH_SIZE = 50;
export const REMINDER_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
export const REMINDER_MAX_PROVIDER_ATTEMPTS = 3;
export const REMINDER_RETRY_DELAYS_MS = [
  5 * 60 * 1000,
  30 * 60 * 1000,
] as const;

export class ScheduleDueRemindersUseCase {
  constructor(
    private readonly schedulingRepository: ReminderSchedulingRepository,
  ) {}

  async execute(now: Date): Promise<{
    candidates: number;
    due: number;
    scheduled: number;
  }> {
    if (Number.isNaN(now.getTime())) {
      throw new Error("Current time must be a valid date");
    }

    const candidates = await this.schedulingRepository.findEnabledCandidates();
    const graceWindowStart =
      now.getTime() - REMINDER_SCHEDULING_GRACE_PERIOD_MS;
    let due = 0;
    let scheduled = 0;

    for (const candidate of candidates) {
      if (!candidate.enabled) {
        continue;
      }

      const scheduledFor = getReminderOccurrence(
        now,
        candidate.reminderTime,
        candidate.timezone,
      );
      const scheduledAt = scheduledFor.getTime();

      if (scheduledAt > now.getTime() || scheduledAt <= graceWindowStart) {
        continue;
      }

      due++;
      const delivery = ReminderDelivery.create({
        id: crypto.randomUUID(),
        userId: candidate.userId,
        recipientEmail: candidate.recipientEmail,
        bookTitle: candidate.bookTitle,
        bookCurrentPage: candidate.bookCurrentPage,
        bookTotalPages: candidate.bookTotalPages,
        dailyPageTarget: candidate.dailyPageTarget,
        scheduledFor,
      });

      if (await this.schedulingRepository.createDeliveryIfAbsent(delivery)) {
        scheduled++;
      }
    }

    return { candidates: candidates.length, due, scheduled };
  }
}

export class ProcessReminderDeliveriesUseCase {
  constructor(
    private readonly dispatchRepository: ReminderDispatchRepository,
    private readonly emailSender: ReminderEmailSender,
  ) {}

  async execute(
    now: Date,
    batchSize: number = REMINDER_DISPATCH_BATCH_SIZE,
  ): Promise<{
    recovered: number;
    claimed: number;
    sent: number;
    skipped: number;
    retryScheduled: number;
    terminalFailed: number;
    unresolved: number;
  }> {
    if (Number.isNaN(now.getTime())) {
      throw new Error("Current time must be a valid date");
    }
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error("Batch size must be a positive integer");
    }

    const staleBefore = new Date(now.getTime() - REMINDER_CLAIM_TIMEOUT_MS);
    const recovered = await this.dispatchRepository.recoverStaleClaims(
      staleBefore,
      now,
    );
    const claimedDeliveries = await this.dispatchRepository.claimDueDeliveries(
      now,
      batchSize,
      REMINDER_MAX_PROVIDER_ATTEMPTS,
    );

    let sent = 0;
    let skipped = 0;
    let retryScheduled = 0;
    let terminalFailed = 0;
    let unresolved = 0;

    for (const delivery of claimedDeliveries) {
      const claimedAt = delivery.lockedAt;
      if (!claimedAt) {
        unresolved++;
        continue;
      }

      let skipReason:
        "REMINDERS_DISABLED" | "ALREADY_READ_TODAY" | "NO_ACTIVE_BOOK" | null =
        null;
      try {
        const eligibility = await this.dispatchRepository.findEligibility(
          delivery.userId,
        );

        if (!eligibility.remindersEnabled) {
          skipReason = "REMINDERS_DISABLED";
        } else {
          const day = getLocalDayBounds(now, eligibility.timezone);
          const alreadyRead =
            await this.dispatchRepository.hasReadingSessionBetween(
              delivery.userId,
              day.start,
              day.end,
            );
          if (alreadyRead) {
            skipReason = "ALREADY_READ_TODAY";
          } else if (!eligibility.hasActiveBook) {
            skipReason = "NO_ACTIVE_BOOK";
          }
        }
      } catch {
        unresolved++;
        continue;
      }

      if (skipReason) {
        const saved = await this.dispatchRepository.saveClaimResult(
          delivery.markSkipped(skipReason, now),
          claimedAt,
        );
        if (saved) skipped++;
        else unresolved++;
        continue;
      }

      let result: ReminderEmailSendResult;
      try {
        result = await this.emailSender.sendReminder({
          deliveryId: delivery.id,
          recipientEmail: delivery.recipientEmail,
          bookTitle: delivery.bookTitle,
          bookCurrentPage: delivery.bookCurrentPage,
          bookTotalPages: delivery.bookTotalPages,
          dailyPageTarget: delivery.dailyPageTarget,
          scheduledFor: delivery.scheduledFor,
        });
      } catch {
        result = {
          status: "FAILED",
          classification: "RETRYABLE",
          errorCode: "UNKNOWN_PROVIDER_ERROR",
        };
      }

      if (result.status === "FAILED") {
        const attemptNumber = delivery.attemptCount + 1;
        const retryDelay = REMINDER_RETRY_DELAYS_MS[attemptNumber - 1];
        const shouldRetry =
          result.classification === "RETRYABLE" &&
          attemptNumber < REMINDER_MAX_PROVIDER_ATTEMPTS &&
          retryDelay !== undefined;
        const nextAttemptAt = shouldRetry
          ? new Date(now.getTime() + retryDelay)
          : null;
        const saved = await this.dispatchRepository.saveClaimResult(
          delivery.markFailed(result.errorCode, nextAttemptAt, now),
          claimedAt,
        );
        if (saved) {
          if (shouldRetry) retryScheduled++;
          else terminalFailed++;
        } else {
          unresolved++;
        }
        continue;
      }

      const saved = await this.dispatchRepository.saveClaimResult(
        delivery.markSent(result.providerMessageId, now),
        claimedAt,
      );
      if (saved) sent++;
      else unresolved++;
    }

    return {
      recovered,
      claimed: claimedDeliveries.length,
      sent,
      skipped,
      retryScheduled,
      terminalFailed,
      unresolved,
    };
  }
}

export interface ReminderEmailSender {
  sendReminder(input: ReminderEmailInput): Promise<ReminderEmailSendResult>;
}

export interface ReminderEmailInput {
  deliveryId: string;
  recipientEmail: string;
  bookTitle: string | null;
  bookCurrentPage: number | null;
  bookTotalPages: number | null;
  dailyPageTarget: number;
  scheduledFor: Date;
}

export type ReminderEmailFailureClassification = "RETRYABLE" | "PERMANENT";

export type ReminderEmailFailureCode =
  | "RESEND_RATE_LIMIT"
  | "RESEND_TIMEOUT"
  | "RESEND_NETWORK_ERROR"
  | "RESEND_SERVER_ERROR"
  | "RESEND_TEMPORARY_CONFLICT"
  | "RESEND_INVALID_REQUEST"
  | "RESEND_IDEMPOTENCY_CONFLICT"
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_CONFIG_ERROR"
  | "UNKNOWN_PROVIDER_ERROR";

export type ReminderEmailSendResult =
  | { status: "ACCEPTED"; providerMessageId: string }
  | {
      status: "FAILED";
      classification: ReminderEmailFailureClassification;
      errorCode: ReminderEmailFailureCode;
    };
