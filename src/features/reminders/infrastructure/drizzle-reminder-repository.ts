import { db } from "@/db/client";
import { reminderPreferences, reminderDeliveries } from "@/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import {
  ReminderPreference,
  type ReminderPreferenceProps,
  ReminderDelivery,
  type ReminderDeliveryProps,
  type DeliveryStatusValue,
  type ReminderPreferenceRepository,
  type ReminderDeliveryRepository,
} from "../domain";

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

function toPreferenceDomain(
  row: typeof reminderPreferences.$inferSelect,
): ReminderPreference {
  return ReminderPreference.reconstitute({
    userId: row.userId,
    enabled: row.enabled,
    reminderTime: row.reminderTime,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toDeliveryDomain(
  row: typeof reminderDeliveries.$inferSelect,
): ReminderDelivery {
  return ReminderDelivery.reconstitute({
    id: row.id,
    userId: row.userId,
    status: row.status as DeliveryStatusValue,
    scheduledFor: row.scheduledFor,
    sentAt: row.sentAt,
    attemptCount: row.attemptCount,
    providerMessageId: row.providerMessageId,
    errorCode: row.errorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toPreferencePersistence(props: ReminderPreferenceProps) {
  return {
    userId: props.userId,
    enabled: props.enabled,
    reminderTime: props.reminderTime,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  };
}

function toDeliveryPersistence(props: ReminderDeliveryProps) {
  return {
    id: props.id,
    userId: props.userId,
    status: props.status,
    scheduledFor: props.scheduledFor,
    sentAt: props.sentAt,
    attemptCount: props.attemptCount,
    providerMessageId: props.providerMessageId,
    errorCode: props.errorCode,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  };
}

export class DrizzleReminderPreferenceRepository implements ReminderPreferenceRepository {
  async findByUserId(userId: string): Promise<ReminderPreference | null> {
    const database = getDb();
    const rows = await database
      .select()
      .from(reminderPreferences)
      .where(eq(reminderPreferences.userId, userId))
      .limit(1);
    return rows[0] ? toPreferenceDomain(rows[0]) : null;
  }

  async save(preference: ReminderPreference): Promise<void> {
    const database = getDb();
    const data = toPreferencePersistence(preference.toPersistence());
    await database
      .insert(reminderPreferences)
      .values(data)
      .onConflictDoUpdate({
        target: reminderPreferences.userId,
        set: {
          enabled: data.enabled,
          reminderTime: data.reminderTime,
          updatedAt: data.updatedAt,
        },
      });
  }
}

export class DrizzleReminderDeliveryRepository implements ReminderDeliveryRepository {
  async findByUserIdAndScheduledFor(
    userId: string,
    scheduledFor: Date,
  ): Promise<ReminderDelivery | null> {
    const database = getDb();
    const rows = await database
      .select()
      .from(reminderDeliveries)
      .where(
        and(
          eq(reminderDeliveries.userId, userId),
          eq(reminderDeliveries.scheduledFor, scheduledFor),
        ),
      )
      .limit(1);
    return rows[0] ? toDeliveryDomain(rows[0]) : null;
  }

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<ReminderDelivery[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(reminderDeliveries)
      .where(eq(reminderDeliveries.userId, userId))
      .orderBy(desc(reminderDeliveries.scheduledFor))
      .limit(limit)
      .offset(offset);
    return rows.map(toDeliveryDomain);
  }

  async findPendingByScheduledBefore(
    scheduledBefore: Date,
    limit: number,
  ): Promise<ReminderDelivery[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(reminderDeliveries)
      .where(
        and(
          eq(reminderDeliveries.status, "PENDING"),
          lte(reminderDeliveries.scheduledFor, scheduledBefore),
        ),
      )
      .orderBy(reminderDeliveries.scheduledFor)
      .limit(limit);
    return rows.map(toDeliveryDomain);
  }

  async findByStatus(
    status: DeliveryStatusValue,
    limit = 50,
    offset = 0,
  ): Promise<ReminderDelivery[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(reminderDeliveries)
      .where(eq(reminderDeliveries.status, status))
      .orderBy(desc(reminderDeliveries.scheduledFor))
      .limit(limit)
      .offset(offset);
    return rows.map(toDeliveryDomain);
  }

  async save(delivery: ReminderDelivery): Promise<void> {
    const database = getDb();
    const data = toDeliveryPersistence(delivery.toPersistence());
    await database
      .insert(reminderDeliveries)
      .values(data)
      .onConflictDoUpdate({
        target: reminderDeliveries.id,
        set: {
          status: data.status,
          sentAt: data.sentAt,
          attemptCount: data.attemptCount,
          providerMessageId: data.providerMessageId,
          errorCode: data.errorCode,
          updatedAt: data.updatedAt,
        },
      });
  }

  async saveMany(deliveries: ReminderDelivery[]): Promise<void> {
    const database = getDb();
    const data = deliveries.map((d) =>
      toDeliveryPersistence(d.toPersistence()),
    );
    if (data.length === 0) return;

    await database
      .insert(reminderDeliveries)
      .values(data)
      .onConflictDoUpdate({
        target: reminderDeliveries.id,
        set: {
          status: data[0].status,
          sentAt: data[0].sentAt,
          attemptCount: data[0].attemptCount,
          providerMessageId: data[0].providerMessageId,
          errorCode: data[0].errorCode,
          updatedAt: data[0].updatedAt,
        },
      });
  }
}
