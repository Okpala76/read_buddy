import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db/client";
import { pushSubscriptions } from "@/db/schema";
import type {
  PushSubscriptionRepository,
  RegisterPushSubscriptionInput,
  StoredPushSubscription,
} from "@/features/push-notifications/application";

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export class DrizzlePushSubscriptionRepository implements PushSubscriptionRepository {
  async upsertForUser(
    userId: string,
    input: RegisterPushSubscriptionInput,
    now: Date,
  ): Promise<void> {
    const rows = await getDb()
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
        updatedAt: now,
        lastUsedAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        setWhere: or(
          eq(pushSubscriptions.userId, userId),
          and(
            eq(pushSubscriptions.p256dh, input.keys.p256dh),
            eq(pushSubscriptions.auth, input.keys.auth),
          ),
        ),
        set: {
          userId,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent ?? null,
          updatedAt: now,
          lastUsedAt: now,
          revokedAt: null,
        },
      })
      .returning({ id: pushSubscriptions.id });

    if (rows.length !== 1) {
      throw new Error("Push subscription ownership could not be verified");
    }
  }

  async findActiveForUser(
    userId: string,
    endpoint: string,
  ): Promise<StoredPushSubscription | null> {
    const rows = await getDb()
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
          isNull(pushSubscriptions.revokedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async listActiveForUser(userId: string): Promise<StoredPushSubscription[]> {
    return getDb()
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          isNull(pushSubscriptions.revokedAt),
        ),
      );
  }

  async revokeForUser(
    userId: string,
    endpoint: string,
    now: Date,
  ): Promise<boolean> {
    const rows = await getDb()
      .update(pushSubscriptions)
      .set({ revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
          isNull(pushSubscriptions.revokedAt),
        ),
      )
      .returning({ id: pushSubscriptions.id });

    return rows.length === 1;
  }

  async markUsedForUser(
    userId: string,
    endpoint: string,
    now: Date,
  ): Promise<void> {
    await getDb()
      .update(pushSubscriptions)
      .set({ lastUsedAt: now, updatedAt: now })
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
          isNull(pushSubscriptions.revokedAt),
        ),
      );
  }
}
