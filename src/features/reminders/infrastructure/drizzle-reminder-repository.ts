import { db } from "@/db/client";
import {
  books,
  readingSessions,
  reminderPreferences,
  reminderDeliveries,
  users,
} from "@/db/schema";
import {
  eq,
  and,
  lte,
  desc,
  gte,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import {
  ReminderPreference,
  type ReminderPreferenceProps,
  ReminderDelivery,
  type ReminderDeliveryProps,
  type DeliveryStatusValue,
  type ReminderPreferenceRepository,
  type ReminderDeliveryRepository,
  type ReminderDispatchRepository,
  type ReminderSchedulingRepository,
  type ReminderSkipReasonValue,
  type ReminderDeliveryChannel,
  type ReminderNotificationKind,
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
    emailEnabled: row.emailEnabled,
    reminderTime: row.reminderTime,
    streakRescueEnabled: row.streakRescueEnabled,
    streakRescueTime: row.streakRescueTime,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
    adaptiveTimingEnabled: row.adaptiveTimingEnabled,
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
    recipientEmail: row.recipientEmail,
    bookTitle: row.bookTitle,
    bookCurrentPage: row.bookCurrentPage,
    bookTotalPages: row.bookTotalPages,
    dailyPageTarget: row.dailyPageTarget,
    status: row.status as DeliveryStatusValue,
    deliveryChannel: row.deliveryChannel as ReminderDeliveryChannel | null,
    notificationKind: row.notificationKind as ReminderNotificationKind,
    scheduledFor: row.scheduledFor,
    lockedAt: row.lockedAt,
    nextAttemptAt: row.nextAttemptAt,
    sentAt: row.sentAt,
    attemptCount: row.attemptCount,
    providerMessageId: row.providerMessageId,
    errorCode: row.errorCode,
    skipReason: row.skipReason as ReminderSkipReasonValue | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toPreferencePersistence(props: ReminderPreferenceProps) {
  return {
    userId: props.userId,
    enabled: props.enabled,
    emailEnabled: props.emailEnabled,
    reminderTime: props.reminderTime,
    streakRescueEnabled: props.streakRescueEnabled,
    streakRescueTime: props.streakRescueTime,
    quietHoursStart: props.quietHoursStart,
    quietHoursEnd: props.quietHoursEnd,
    adaptiveTimingEnabled: props.adaptiveTimingEnabled,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  };
}

function toDeliveryPersistence(props: ReminderDeliveryProps) {
  return {
    id: props.id,
    userId: props.userId,
    recipientEmail: props.recipientEmail,
    bookTitle: props.bookTitle,
    bookCurrentPage: props.bookCurrentPage,
    bookTotalPages: props.bookTotalPages,
    dailyPageTarget: props.dailyPageTarget,
    status: props.status,
    deliveryChannel: props.deliveryChannel,
    notificationKind: props.notificationKind,
    scheduledFor: props.scheduledFor,
    lockedAt: props.lockedAt,
    nextAttemptAt: props.nextAttemptAt,
    sentAt: props.sentAt,
    attemptCount: props.attemptCount,
    providerMessageId: props.providerMessageId,
    errorCode: props.errorCode,
    skipReason: props.skipReason,
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

  async findTimezoneByUserId(userId: string): Promise<string> {
    const database = getDb();
    const rows = await database
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!rows[0]) {
      throw new Error("User not found");
    }

    return rows[0].timezone;
  }

  async saveSettings(
    preference: ReminderPreference,
    timezone: string,
  ): Promise<void> {
    const database = getDb();
    const data = toPreferencePersistence(preference.toPersistence());
    await database.transaction(async (transaction) => {
      await transaction
        .update(users)
        .set({ timezone, updatedAt: data.updatedAt })
        .where(eq(users.id, preference.userId));
      await transaction
        .insert(reminderPreferences)
        .values(data)
        .onConflictDoUpdate({
          target: reminderPreferences.userId,
          set: {
            enabled: data.enabled,
            emailEnabled: data.emailEnabled,
            reminderTime: data.reminderTime,
            streakRescueEnabled: data.streakRescueEnabled,
            streakRescueTime: data.streakRescueTime,
            quietHoursStart: data.quietHoursStart,
            quietHoursEnd: data.quietHoursEnd,
            adaptiveTimingEnabled: data.adaptiveTimingEnabled,
            updatedAt: data.updatedAt,
          },
        });
    });
  }
}

export class DrizzleReminderSchedulingRepository implements ReminderSchedulingRepository {
  async findEnabledCandidates() {
    const database = getDb();
    return database
      .select({
        userId: reminderPreferences.userId,
        recipientEmail: users.email,
        bookTitle: books.title,
        bookCurrentPage: books.currentPage,
        bookTotalPages: books.totalPages,
        dailyPageTarget: users.dailyPageTarget,
        reminderTime: reminderPreferences.reminderTime,
        timezone: users.timezone,
        enabled: reminderPreferences.enabled,
        streakRescueEnabled: reminderPreferences.streakRescueEnabled,
        streakRescueTime: reminderPreferences.streakRescueTime,
        quietHoursStart: reminderPreferences.quietHoursStart,
        quietHoursEnd: reminderPreferences.quietHoursEnd,
        adaptiveTimingEnabled: reminderPreferences.adaptiveTimingEnabled,
      })
      .from(reminderPreferences)
      .innerJoin(users, eq(users.id, reminderPreferences.userId))
      .leftJoin(
        books,
        and(
          eq(books.userId, reminderPreferences.userId),
          eq(books.status, "READING"),
        ),
      )
      .where(eq(reminderPreferences.enabled, true));
  }

  async createDeliveryIfAbsent(delivery: ReminderDelivery): Promise<boolean> {
    const database = getDb();
    const data = toDeliveryPersistence(delivery.toPersistence());
    const inserted = await database
      .insert(reminderDeliveries)
      .values(data)
      .onConflictDoNothing({
        target: [reminderDeliveries.userId, reminderDeliveries.scheduledFor],
      })
      .returning({ id: reminderDeliveries.id });

    return inserted.length === 1;
  }
}

export class DrizzleReminderDeliveryRepository implements ReminderDeliveryRepository {
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

  async findByUserIdAndStatus(
    userId: string,
    status: DeliveryStatusValue,
    limit = 50,
    offset = 0,
  ): Promise<ReminderDelivery[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(reminderDeliveries)
      .where(
        and(
          eq(reminderDeliveries.userId, userId),
          eq(reminderDeliveries.status, status),
        ),
      )
      .orderBy(desc(reminderDeliveries.scheduledFor))
      .limit(limit)
      .offset(offset);
    return rows.map(toDeliveryDomain);
  }
}

export class DrizzleReminderDispatchRepository implements ReminderDispatchRepository {
  async recoverStaleClaims(
    staleBefore: Date,
    recoveredAt: Date,
  ): Promise<number> {
    const database = getDb();
    const recovered = await database
      .update(reminderDeliveries)
      .set({
        status: sql`case
          when ${reminderDeliveries.attemptCount} = 0 then 'PENDING'::reminder_delivery_status
          else 'FAILED'::reminder_delivery_status
        end`,
        lockedAt: null,
        updatedAt: recoveredAt,
      })
      .where(
        and(
          eq(reminderDeliveries.status, "PROCESSING"),
          or(
            isNull(reminderDeliveries.lockedAt),
            lt(reminderDeliveries.lockedAt, staleBefore),
          ),
        ),
      )
      .returning({ id: reminderDeliveries.id });

    return recovered.length;
  }

  async claimDueDeliveries(
    now: Date,
    limit: number,
    maxAttempts: number,
  ): Promise<ReminderDelivery[]> {
    if (limit < 1) return [];

    const database = getDb();
    return database.transaction(async (transaction) => {
      const claimable = await transaction
        .select({ id: reminderDeliveries.id })
        .from(reminderDeliveries)
        .where(
          or(
            and(
              eq(reminderDeliveries.status, "PENDING"),
              lte(reminderDeliveries.scheduledFor, now),
            ),
            and(
              eq(reminderDeliveries.status, "FAILED"),
              lte(reminderDeliveries.nextAttemptAt, now),
              lt(reminderDeliveries.attemptCount, maxAttempts),
            ),
          ),
        )
        .orderBy(reminderDeliveries.scheduledFor)
        .limit(limit)
        .for("update", { skipLocked: true });

      if (claimable.length === 0) return [];

      const claimed = await transaction
        .update(reminderDeliveries)
        .set({ status: "PROCESSING", lockedAt: now, updatedAt: now })
        .where(
          and(
            inArray(
              reminderDeliveries.id,
              claimable.map(({ id }) => id),
            ),
            inArray(reminderDeliveries.status, ["PENDING", "FAILED"]),
          ),
        )
        .returning();

      return claimed.map(toDeliveryDomain);
    });
  }

  async findEligibility(userId: string) {
    const database = getDb();
    const [settings, activeBook] = await Promise.all([
      database
        .select({
          timezone: users.timezone,
          remindersEnabled: reminderPreferences.enabled,
          emailEnabled: reminderPreferences.emailEnabled,
          streakRescueEnabled: reminderPreferences.streakRescueEnabled,
          quietHoursStart: reminderPreferences.quietHoursStart,
          quietHoursEnd: reminderPreferences.quietHoursEnd,
          adaptiveTimingEnabled: reminderPreferences.adaptiveTimingEnabled,
        })
        .from(users)
        .leftJoin(reminderPreferences, eq(reminderPreferences.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1),
      database
        .select({ id: books.id })
        .from(books)
        .where(and(eq(books.userId, userId), eq(books.status, "READING")))
        .limit(1),
    ]);

    if (!settings[0]) {
      throw new Error("Reminder delivery user not found");
    }

    return {
      timezone: settings[0].timezone,
      remindersEnabled: settings[0].remindersEnabled ?? false,
      emailEnabled: settings[0].emailEnabled ?? true,
      streakRescueEnabled: settings[0].streakRescueEnabled ?? true,
      quietHoursStart: settings[0].quietHoursStart ?? "22:30:00",
      quietHoursEnd: settings[0].quietHoursEnd ?? "07:00:00",
      adaptiveTimingEnabled: settings[0].adaptiveTimingEnabled ?? false,
      hasActiveBook: activeBook.length === 1,
    };
  }

  async hasReadingSessionBetween(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<boolean> {
    const database = getDb();
    const rows = await database
      .select({ id: readingSessions.id })
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.userId, userId),
          gte(readingSessions.readAt, start),
          lt(readingSessions.readAt, end),
        ),
      )
      .limit(1);
    return rows.length === 1;
  }

  async selectChannel(
    deliveryId: string,
    claimedAt: Date,
    channel: ReminderDeliveryChannel,
    selectedAt: Date,
  ): Promise<boolean> {
    const updated = await getDb()
      .update(reminderDeliveries)
      .set({ deliveryChannel: channel, updatedAt: selectedAt })
      .where(
        and(
          eq(reminderDeliveries.id, deliveryId),
          eq(reminderDeliveries.status, "PROCESSING"),
          eq(reminderDeliveries.lockedAt, claimedAt),
          isNull(reminderDeliveries.deliveryChannel),
        ),
      )
      .returning({ id: reminderDeliveries.id });

    return updated.length === 1;
  }

  async fallbackToEmail(
    deliveryId: string,
    claimedAt: Date,
    selectedAt: Date,
  ): Promise<boolean> {
    const updated = await getDb()
      .update(reminderDeliveries)
      .set({ deliveryChannel: "EMAIL", updatedAt: selectedAt })
      .where(
        and(
          eq(reminderDeliveries.id, deliveryId),
          eq(reminderDeliveries.status, "PROCESSING"),
          eq(reminderDeliveries.lockedAt, claimedAt),
          eq(reminderDeliveries.deliveryChannel, "PUSH"),
          eq(reminderDeliveries.attemptCount, 0),
        ),
      )
      .returning({ id: reminderDeliveries.id });

    return updated.length === 1;
  }

  async saveClaimResult(
    delivery: ReminderDelivery,
    claimedAt: Date,
  ): Promise<boolean> {
    const data = toDeliveryPersistence(delivery.toPersistence());
    if (
      data.status !== "SENT" &&
      data.status !== "FAILED" &&
      data.status !== "SKIPPED"
    ) {
      throw new Error(`Cannot persist ${data.status} as a claim result`);
    }

    const database = getDb();
    const updated = await database
      .update(reminderDeliveries)
      .set({
        status: data.status,
        lockedAt: data.lockedAt,
        nextAttemptAt: data.nextAttemptAt,
        sentAt: data.sentAt,
        attemptCount: data.attemptCount,
        providerMessageId: data.providerMessageId,
        errorCode: data.errorCode,
        skipReason: data.skipReason,
        updatedAt: data.updatedAt,
      })
      .where(
        and(
          eq(reminderDeliveries.id, data.id),
          eq(reminderDeliveries.status, "PROCESSING"),
          eq(reminderDeliveries.lockedAt, claimedAt),
        ),
      )
      .returning({ id: reminderDeliveries.id });

    return updated.length === 1;
  }
}
