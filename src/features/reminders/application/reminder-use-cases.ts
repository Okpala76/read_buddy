import { z } from "zod";
import {
  ReminderPreference,
  ReminderDelivery,
  type ReminderPreferenceRepository,
  type ReminderDeliveryRepository,
} from "../domain";

export const getReminderPreferenceInputSchema = z.object({});

export type GetReminderPreferenceInput = z.infer<
  typeof getReminderPreferenceInputSchema
>;

export const updateReminderPreferenceInputSchema = z.object({
  enabled: z.boolean().optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .optional(),
});

export type UpdateReminderPreferenceInput = z.infer<
  typeof updateReminderPreferenceInputSchema
>;

export const getReminderDeliveriesInputSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  status: z.enum(["PENDING", "SENT", "FAILED", "SKIPPED"]).optional(),
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

export class UpdateReminderPreferenceUseCase {
  constructor(
    private readonly preferenceRepository: ReminderPreferenceRepository,
  ) {}

  async execute(
    userId: string,
    input: UpdateReminderPreferenceInput,
  ): Promise<ReminderPreference> {
    const parsed = updateReminderPreferenceInputSchema.parse(input);

    let preference = await this.preferenceRepository.findByUserId(userId);

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

    await this.preferenceRepository.save(preference);
    return preference;
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
      return this.deliveryRepository.findByStatus(status, limit, offset);
    }

    return this.deliveryRepository.findByUserId(userId, limit, offset);
  }
}

export class ScheduleReminderDeliveryUseCase {
  constructor(
    private readonly deliveryRepository: ReminderDeliveryRepository,
    private readonly preferenceRepository: ReminderPreferenceRepository,
  ) {}

  async execute(userId: string, scheduledFor: Date): Promise<ReminderDelivery> {
    const existing = await this.deliveryRepository.findByUserIdAndScheduledFor(
      userId,
      scheduledFor,
    );

    if (existing) {
      return existing;
    }

    const delivery = ReminderDelivery.create({
      id: crypto.randomUUID(),
      userId,
      scheduledFor,
    });

    await this.deliveryRepository.save(delivery);
    return delivery;
  }
}

export class ProcessReminderDeliveriesUseCase {
  constructor(
    private readonly deliveryRepository: ReminderDeliveryRepository,
    private readonly preferenceRepository: ReminderPreferenceRepository,
    private readonly sendReminderEmail: (
      userId: string,
      delivery: {
        id: string;
        scheduledFor: Date;
      },
    ) => Promise<{ messageId: string }>,
  ) {}

  async execute(
    scheduledBefore: Date,
    batchSize: number = 100,
  ): Promise<{
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const pendingDeliveries =
      await this.deliveryRepository.findPendingByScheduledBefore(
        scheduledBefore,
        batchSize,
      );

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const delivery of pendingDeliveries) {
      try {
        const preference = await this.preferenceRepository.findByUserId(
          delivery.userId,
        );

        if (!preference || !preference.enabled) {
          const skippedDelivery = delivery.markSkipped();
          await this.deliveryRepository.save(skippedDelivery);
          skipped++;
          continue;
        }

        const result = await this.sendReminderEmail(delivery.userId, {
          id: delivery.id,
          scheduledFor: delivery.scheduledFor,
        });

        const sentDelivery = delivery.markSent(result.messageId);
        await this.deliveryRepository.save(sentDelivery);
        sent++;
      } catch (error) {
        const errorCode =
          error instanceof Error ? error.message : "UNKNOWN_ERROR";
        const failedDelivery = delivery.markFailed(errorCode);
        await this.deliveryRepository.save(failedDelivery);
        failed++;
      }
    }

    return {
      processed: pendingDeliveries.length,
      sent,
      failed,
      skipped,
    };
  }
}

export class RetryFailedDeliveriesUseCase {
  constructor(
    private readonly deliveryRepository: ReminderDeliveryRepository,
    private readonly sendReminderEmail: (
      userId: string,
      delivery: {
        id: string;
        scheduledFor: Date;
      },
    ) => Promise<{ messageId: string }>,
  ) {}

  async execute(maxAttempts: number = 3): Promise<{
    retried: number;
    sent: number;
    failed: number;
  }> {
    const failedDeliveries = await this.deliveryRepository.findByStatus(
      "FAILED",
      100,
      0,
    );

    const retryable = failedDeliveries.filter(
      (d: ReminderDelivery) => d.attemptCount < maxAttempts,
    );

    let sent = 0;
    let failed = 0;

    for (const delivery of retryable) {
      try {
        const result = await this.sendReminderEmail(delivery.userId, {
          id: delivery.id,
          scheduledFor: delivery.scheduledFor,
        });

        const sentDelivery = delivery.markSent(result.messageId);
        await this.deliveryRepository.save(sentDelivery);
        sent++;
      } catch (error) {
        const errorCode =
          error instanceof Error ? error.message : "UNKNOWN_ERROR";
        const failedDelivery = delivery.markFailed(errorCode);
        await this.deliveryRepository.save(failedDelivery);
        failed++;
      }
    }

    return {
      retried: retryable.length,
      sent,
      failed,
    };
  }
}
