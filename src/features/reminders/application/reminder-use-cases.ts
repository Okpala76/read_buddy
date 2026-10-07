import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";
import {
  getReminderOccurrence,
  getLocalDayBounds,
  isValidIanaTimezone,
  normalizeIanaTimezone,
  NotificationDecisionEngine,
  ReminderPreference,
  ReminderDelivery,
  type ReminderPreferenceRepository,
  type ReminderDeliveryRepository,
  type ReminderDispatchRepository,
  type ReminderDispatchEligibility,
  type ReminderSchedulingRepository,
} from "../domain";
import { GetEffectiveReminderTimeUseCase } from "./get-effective-reminder-time";

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
  emailEnabled: z.boolean().optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .optional(),
  adaptiveTimingEnabled: z.boolean().optional(),
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
        emailEnabled: parsed.emailEnabled ?? true,
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
      if (parsed.emailEnabled !== undefined) {
        preference = preference.updateEmailEnabled(parsed.emailEnabled);
      }
      if (parsed.adaptiveTimingEnabled !== undefined) {
        preference = preference.updateAdaptiveTimingEnabled(
          parsed.adaptiveTimingEnabled,
        );
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
    private readonly effectiveTimeUseCase: GetEffectiveReminderTimeUseCase,
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

      const effectiveTime = await this.effectiveTimeUseCase.execute(
        candidate.userId,
        now,
      );

      // Schedule DAILY_REMINDER
      const dailyScheduledFor = getReminderOccurrence(
        now,
        effectiveTime.time,
        candidate.timezone,
      );
      const dailyScheduledAt = dailyScheduledFor.getTime();

      if (
        dailyScheduledAt <= now.getTime() &&
        dailyScheduledAt > graceWindowStart
      ) {
        due++;
        const dailyDelivery = ReminderDelivery.create({
          id: crypto.randomUUID(),
          userId: candidate.userId,
          recipientEmail: candidate.recipientEmail,
          bookTitle: candidate.bookTitle,
          bookCurrentPage: candidate.bookCurrentPage,
          bookTotalPages: candidate.bookTotalPages,
          dailyPageTarget: candidate.dailyPageTarget,
          scheduledFor: dailyScheduledFor,
          notificationKind: "DAILY_REMINDER",
        });

        if (
          await this.schedulingRepository.createDeliveryIfAbsent(dailyDelivery)
        ) {
          scheduled++;
        }
      }

      // Schedule STREAK_RESCUE if enabled
      if (candidate.streakRescueEnabled) {
        const rescueScheduledFor = getReminderOccurrence(
          now,
          candidate.streakRescueTime,
          candidate.timezone,
        );
        const rescueScheduledAt = rescueScheduledFor.getTime();

        if (
          rescueScheduledAt <= now.getTime() &&
          rescueScheduledAt > graceWindowStart
        ) {
          due++;
          const rescueDelivery = ReminderDelivery.create({
            id: crypto.randomUUID(),
            userId: candidate.userId,
            recipientEmail: candidate.recipientEmail,
            bookTitle: candidate.bookTitle,
            bookCurrentPage: candidate.bookCurrentPage,
            bookTotalPages: candidate.bookTotalPages,
            dailyPageTarget: candidate.dailyPageTarget,
            scheduledFor: rescueScheduledFor,
            notificationKind: "STREAK_RESCUE",
          });

          if (
            await this.schedulingRepository.createDeliveryIfAbsent(
              rescueDelivery,
            )
          ) {
            scheduled++;
          }
        }
      }
    }

    return { candidates: candidates.length, due, scheduled };
  }
}

export class ProcessReminderDeliveriesUseCase {
  constructor(
    private readonly dispatchRepository: ReminderDispatchRepository,
    private readonly emailSender: ReminderEmailSender,
    private readonly pushSender: ReminderPushSender,
    private readonly streakService: ReminderStreakService,
    private readonly decisionEngine = new NotificationDecisionEngine(),
  ) {}

  async execute(
    now: Date,
    batchSize: number = REMINDER_DISPATCH_BATCH_SIZE,
  ): Promise<{
    recovered: number;
    claimed: number;
    sent: number;
    pushSelected: number;
    emailSelected: number;
    sentPush: number;
    sentEmail: number;
    pushFallbackToEmail: number;
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
    let pushSelected = 0;
    let emailSelected = 0;
    let sentPush = 0;
    let sentEmail = 0;
    let pushFallbackToEmail = 0;
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

      let eligibility: ReminderDispatchEligibility;
      let alreadyReadToday = false;
      let pushAvailable = false;
      let streakStatus: "ACTIVE" | "AT_RISK" | "BROKEN" = "BROKEN";
      let inQuietHours = false;
      try {
        eligibility = await this.dispatchRepository.findEligibility(
          delivery.userId,
        );
        if (eligibility.remindersEnabled) {
          const day = getLocalDayBounds(now, eligibility.timezone);
          alreadyReadToday =
            await this.dispatchRepository.hasReadingSessionBetween(
              delivery.userId,
              day.start,
              day.end,
            );
          if (
            !alreadyReadToday &&
            eligibility.hasActiveBook &&
            delivery.deliveryChannel === null
          ) {
            pushAvailable = await this.pushSender.hasActiveSubscription(
              delivery.userId,
            );
          }
        }

        // For STREAK_RESCUE, check streak status and quiet hours
        if (delivery.notificationKind === "STREAK_RESCUE") {
          const streakResult = await this.streakService.getStreak(
            delivery.userId,
            now,
          );
          streakStatus = streakResult.status;

          // Check quiet hours for STREAK_RESCUE
          const localNow = Temporal.Instant.fromEpochMilliseconds(
            now.getTime(),
          ).toZonedDateTimeISO(eligibility.timezone);
          const currentTime = localNow.toPlainTime();
          const [startHour, startMinute] = eligibility.quietHoursStart
            .split(":")
            .map(Number);
          const [endHour, endMinute] = eligibility.quietHoursEnd
            .split(":")
            .map(Number);
          const quietStart = Temporal.PlainTime.from({
            hour: startHour,
            minute: startMinute,
          });
          const quietEnd = Temporal.PlainTime.from({
            hour: endHour,
            minute: endMinute,
          });

          if (Temporal.PlainTime.compare(quietStart, quietEnd) < 0) {
            inQuietHours =
              Temporal.PlainTime.compare(currentTime, quietStart) >= 0 &&
              Temporal.PlainTime.compare(currentTime, quietEnd) < 0;
          } else {
            inQuietHours =
              Temporal.PlainTime.compare(currentTime, quietStart) >= 0 ||
              Temporal.PlainTime.compare(currentTime, quietEnd) < 0;
          }
        }
      } catch {
        unresolved++;
        continue;
      }

      const decision = this.decisionEngine.decide({
        remindersEnabled: eligibility.remindersEnabled,
        emailEnabled: eligibility.emailEnabled,
        alreadyReadToday,
        hasActiveBook: eligibility.hasActiveBook,
        pushAvailable,
        selectedChannel: delivery.deliveryChannel,
        notificationKind: delivery.notificationKind,
        streakRescueEnabled: eligibility.streakRescueEnabled,
        streakStatus,
        inQuietHours,
      });

      if (decision.action === "SKIP") {
        const saved = await this.dispatchRepository.saveClaimResult(
          delivery.markSkipped(decision.reason, now),
          claimedAt,
        );
        if (saved) skipped++;
        else unresolved++;
        continue;
      }

      let selectedDelivery = delivery;
      const selectedNow = delivery.deliveryChannel === null;
      if (selectedNow) {
        const selected = await this.dispatchRepository.selectChannel(
          delivery.id,
          claimedAt,
          decision.action,
          now,
        );
        if (!selected) {
          unresolved++;
          continue;
        }
        selectedDelivery = delivery.selectChannel(decision.action);
      }

      let channel = decision.action;
      let result: ReminderProviderSendResult;
      if (channel === "PUSH") {
        pushSelected++;
        try {
          const pushResult = await this.pushSender.sendReminder(
            delivery.userId,
            delivery.id,
          );
          if (
            pushResult.status === "NO_ACTIVE_SUBSCRIPTIONS" &&
            selectedNow &&
            eligibility.emailEnabled
          ) {
            const changed = await this.dispatchRepository.fallbackToEmail(
              delivery.id,
              claimedAt,
              now,
            );
            if (!changed) {
              unresolved++;
              continue;
            }
            selectedDelivery = selectedDelivery.fallbackToEmail();
            channel = "EMAIL";
            emailSelected++;
            pushFallbackToEmail++;
            result = await this.sendEmail(selectedDelivery);
          } else if (pushResult.status === "NO_ACTIVE_SUBSCRIPTIONS") {
            result = {
              status: "FAILED",
              classification: "PERMANENT",
              errorCode: "PUSH_NO_ACTIVE_SUBSCRIPTIONS",
            };
          } else {
            result = pushResult;
          }
        } catch {
          result = {
            status: "FAILED",
            classification: "RETRYABLE",
            errorCode: "PUSH_TEMPORARY_FAILURE",
          };
        }
      } else {
        emailSelected++;
        result = await this.sendEmail(selectedDelivery);
      }

      const outcome = await this.saveProviderResult(
        selectedDelivery,
        claimedAt,
        result,
        now,
      );
      if (outcome === "SENT") {
        sent++;
        if (channel === "PUSH") sentPush++;
        else sentEmail++;
      } else if (outcome === "RETRY_SCHEDULED") {
        retryScheduled++;
      } else if (outcome === "TERMINAL_FAILED") {
        terminalFailed++;
      } else {
        unresolved++;
      }
    }

    return {
      recovered,
      claimed: claimedDeliveries.length,
      sent,
      pushSelected,
      emailSelected,
      sentPush,
      sentEmail,
      pushFallbackToEmail,
      skipped,
      retryScheduled,
      terminalFailed,
      unresolved,
    };
  }

  private async sendEmail(
    delivery: ReminderDelivery,
  ): Promise<ReminderEmailSendResult> {
    try {
      return await this.emailSender.sendReminder({
        deliveryId: delivery.id,
        recipientEmail: delivery.recipientEmail,
        bookTitle: delivery.bookTitle,
        bookCurrentPage: delivery.bookCurrentPage,
        bookTotalPages: delivery.bookTotalPages,
        dailyPageTarget: delivery.dailyPageTarget,
        scheduledFor: delivery.scheduledFor,
      });
    } catch {
      return {
        status: "FAILED",
        classification: "RETRYABLE",
        errorCode: "UNKNOWN_PROVIDER_ERROR",
      };
    }
  }

  private async saveProviderResult(
    delivery: ReminderDelivery,
    claimedAt: Date,
    result: ReminderProviderSendResult,
    now: Date,
  ): Promise<"SENT" | "RETRY_SCHEDULED" | "TERMINAL_FAILED" | "UNRESOLVED"> {
    if (result.status === "ACCEPTED") {
      const saved = await this.dispatchRepository.saveClaimResult(
        delivery.markSent(result.providerMessageId, now),
        claimedAt,
      );
      return saved ? "SENT" : "UNRESOLVED";
    }

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
    if (!saved) return "UNRESOLVED";
    return shouldRetry ? "RETRY_SCHEDULED" : "TERMINAL_FAILED";
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

export interface ReminderPushSender {
  hasActiveSubscription(userId: string): Promise<boolean>;
  sendReminder(
    userId: string,
    deliveryId: string,
  ): Promise<ReminderPushSendResult>;
}

export type ReminderPushFailureCode =
  "PUSH_TEMPORARY_FAILURE" | "PUSH_CONFIGURATION_ERROR" | "PUSH_PROVIDER_ERROR";

export type ReminderPushSendResult =
  | {
      status: "ACCEPTED";
      providerMessageId: string;
      attempted: number;
      accepted: number;
      invalidated: number;
    }
  | {
      status: "NO_ACTIVE_SUBSCRIPTIONS";
      attempted: number;
      invalidated: number;
    }
  | {
      status: "FAILED";
      classification: ReminderEmailFailureClassification;
      errorCode: ReminderPushFailureCode;
      attempted: number;
      invalidated: number;
    };

type ReminderProviderSendResult =
  | { status: "ACCEPTED"; providerMessageId: string }
  | {
      status: "FAILED";
      classification: ReminderEmailFailureClassification;
      errorCode:
        | ReminderEmailFailureCode
        | ReminderPushFailureCode
        | "PUSH_NO_ACTIVE_SUBSCRIPTIONS";
    };

export interface GetReadingStreakInput {
  now?: Date;
}

export interface ReadingStreakResult {
  count: number;
  status: "ACTIVE" | "AT_RISK" | "BROKEN";
}

export interface ReminderStreakService {
  getStreak(userId: string, now: Date): Promise<ReadingStreakResult>;
}

export class GetReadingStreakUseCase {
  constructor(private readonly streakService: ReminderStreakService) {}

  async execute(
    userId: string,
    input: GetReadingStreakInput = {},
  ): Promise<ReadingStreakResult> {
    const now = input.now ?? new Date();
    return this.streakService.getStreak(userId, now);
  }
}
