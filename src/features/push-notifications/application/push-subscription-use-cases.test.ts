import { describe, expect, it, vi } from "vitest";

import type {
  PushNotificationSender,
  PushSendResult,
  PushSubscriptionRepository,
  RegisterPushSubscriptionInput,
  StoredPushSubscription,
} from "./push-subscription-use-cases";
import {
  RegisterPushSubscriptionUseCase,
  RevokePushSubscriptionUseCase,
  SendTestPushUseCase,
} from "./push-subscription-use-cases";

const subscriptionInput = (
  endpoint: string,
): RegisterPushSubscriptionInput => ({
  endpoint,
  keys: {
    p256dh: "p256dh_key_value_123",
    auth: "auth_key_value_123",
  },
  userAgent: "Test Browser",
});

class InMemoryPushSubscriptionRepository implements PushSubscriptionRepository {
  readonly subscriptions = new Map<string, StoredPushSubscription>();

  async upsertForUser(
    userId: string,
    input: RegisterPushSubscriptionInput,
    now: Date,
  ) {
    const existing = this.subscriptions.get(input.endpoint);
    if (
      existing &&
      existing.userId !== userId &&
      (existing.p256dh !== input.keys.p256dh ||
        existing.auth !== input.keys.auth)
    ) {
      throw new Error("Push subscription ownership could not be verified");
    }
    this.subscriptions.set(input.endpoint, {
      id: existing?.id ?? crypto.randomUUID(),
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastUsedAt: now,
      revokedAt: null,
    });
  }

  async findActiveForUser(userId: string, endpoint: string) {
    const subscription = this.subscriptions.get(endpoint);
    return subscription?.userId === userId && !subscription.revokedAt
      ? subscription
      : null;
  }

  async revokeForUser(userId: string, endpoint: string, now: Date) {
    const subscription = await this.findActiveForUser(userId, endpoint);
    if (!subscription) return false;
    subscription.revokedAt = now;
    subscription.updatedAt = now;
    return true;
  }

  async markUsedForUser(userId: string, endpoint: string, now: Date) {
    const subscription = await this.findActiveForUser(userId, endpoint);
    if (subscription) subscription.lastUsedAt = now;
  }
}

function sender(result: PushSendResult): PushNotificationSender & {
  send: ReturnType<typeof vi.fn>;
} {
  return { send: vi.fn().mockResolvedValue(result) };
}

describe("push subscription use cases", () => {
  it("registers a subscription for the authenticated user", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new RegisterPushSubscriptionUseCase(repository);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/device-a",
    );

    await useCase.execute("user-a", input);

    expect(repository.subscriptions.get(input.endpoint)?.userId).toBe("user-a");
  });

  it("rejects caller-supplied ownership", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new RegisterPushSubscriptionUseCase(repository);

    await expect(
      useCase.execute("user-a", {
        ...subscriptionInput("https://fcm.googleapis.com/fcm/send/device-a"),
        userId: "user-b",
      }),
    ).rejects.toThrow();
  });

  it("keeps registration idempotent for the same endpoint", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new RegisterPushSubscriptionUseCase(repository);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/device-a",
    );

    await useCase.execute("user-a", input);
    await useCase.execute("user-a", input);

    expect(repository.subscriptions.size).toBe(1);
  });

  it("allows multiple devices for one user", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new RegisterPushSubscriptionUseCase(repository);

    await useCase.execute(
      "user-a",
      subscriptionInput("https://fcm.googleapis.com/fcm/send/device-a"),
    );
    await useCase.execute(
      "user-a",
      subscriptionInput("https://fcm.googleapis.com/fcm/send/device-b"),
    );

    expect(repository.subscriptions.size).toBe(2);
  });

  it("reassigns an existing browser endpoint during an account switch", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new RegisterPushSubscriptionUseCase(repository);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/shared-browser",
    );

    await useCase.execute("user-a", input);
    await useCase.execute("user-b", input);

    expect(repository.subscriptions.size).toBe(1);
    expect(repository.subscriptions.get(input.endpoint)?.userId).toBe("user-b");
  });

  it("rejects cross-user endpoint claims without matching key material", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new RegisterPushSubscriptionUseCase(repository);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/shared-browser",
    );
    await useCase.execute("user-a", input);

    await expect(
      useCase.execute("user-b", {
        ...input,
        keys: { ...input.keys, auth: "different_auth_key_123" },
      }),
    ).rejects.toThrow(/ownership/);
    expect(repository.subscriptions.get(input.endpoint)?.userId).toBe("user-a");
  });

  it("rejects endpoints outside supported push services", async () => {
    const useCase = new RegisterPushSubscriptionUseCase(
      new InMemoryPushSubscriptionRepository(),
    );

    await expect(
      useCase.execute(
        "user-a",
        subscriptionInput("https://internal.example/push"),
      ),
    ).rejects.toThrow(/supported HTTPS push service/);
  });

  it.each([
    "https://updates.push.services.mozilla.com/wpush/v2/device",
    "https://web.push.apple.com/device",
    "https://wns2-db5p.notify.windows.com/w/device",
  ])("accepts the supported push service endpoint %s", async (endpoint) => {
    const useCase = new RegisterPushSubscriptionUseCase(
      new InMemoryPushSubscriptionRepository(),
    );

    await expect(
      useCase.execute("user-a", subscriptionInput(endpoint)),
    ).resolves.toEqual({ enabled: true });
  });

  it.each([
    "not a URL",
    "http://fcm.googleapis.com/fcm/send/device",
    "https://fcm.googleapis.com:8443/fcm/send/device",
    "https://fcm.googleapis.com.example/fcm/send/device",
  ])("safely rejects the invalid push endpoint %s", async (endpoint) => {
    const useCase = new RegisterPushSubscriptionUseCase(
      new InMemoryPushSubscriptionRepository(),
    );

    await expect(
      useCase.execute("user-a", subscriptionInput(endpoint)),
    ).rejects.toThrow();
  });

  it("does not let one user revoke another user's subscription", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const register = new RegisterPushSubscriptionUseCase(repository);
    const revoke = new RevokePushSubscriptionUseCase(repository);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/device-b",
    );
    await register.execute("user-b", input);

    const result = await revoke.execute("user-a", {
      endpoint: input.endpoint,
    });

    expect(result).toEqual({ revoked: false });
    expect(repository.subscriptions.get(input.endpoint)?.revokedAt).toBeNull();
  });

  it("does not send User A's test notification to User B", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const provider = sender({ status: "ACCEPTED" });
    const register = new RegisterPushSubscriptionUseCase(repository);
    const sendTest = new SendTestPushUseCase(repository, provider);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/device-b",
    );
    await register.execute("user-b", input);

    const result = await sendTest.execute("user-a", {
      endpoint: input.endpoint,
    });

    expect(result).toEqual({ status: "NOT_FOUND" });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("does not send to a revoked subscription", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const provider = sender({ status: "ACCEPTED" });
    const register = new RegisterPushSubscriptionUseCase(repository);
    const revoke = new RevokePushSubscriptionUseCase(repository);
    const sendTest = new SendTestPushUseCase(repository, provider);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/device-a",
    );
    await register.execute("user-a", input);
    await revoke.execute("user-a", { endpoint: input.endpoint });

    expect(
      await sendTest.execute("user-a", { endpoint: input.endpoint }),
    ).toEqual({ status: "NOT_FOUND" });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("marks a successful current-device test push as used", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const provider = sender({ status: "ACCEPTED" });
    const register = new RegisterPushSubscriptionUseCase(repository);
    const sendTest = new SendTestPushUseCase(repository, provider);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/device-a",
    );
    await register.execute("user-a", input);
    const previousLastUsed = repository.subscriptions.get(
      input.endpoint,
    )?.lastUsedAt;

    const result = await sendTest.execute("user-a", {
      endpoint: input.endpoint,
    });

    expect(result).toEqual({ status: "SENT" });
    expect(provider.send).toHaveBeenCalledOnce();
    expect(
      repository.subscriptions.get(input.endpoint)?.lastUsedAt?.getTime(),
    ).toBeGreaterThanOrEqual(previousLastUsed?.getTime() ?? 0);
  });

  it("revokes a permanently expired subscription", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const provider = sender({
      status: "FAILED",
      reason: "SUBSCRIPTION_GONE",
    });
    const register = new RegisterPushSubscriptionUseCase(repository);
    const sendTest = new SendTestPushUseCase(repository, provider);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/device-a",
    );
    await register.execute("user-a", input);

    expect(
      await sendTest.execute("user-a", { endpoint: input.endpoint }),
    ).toEqual({ status: "SUBSCRIPTION_EXPIRED" });
    expect(
      repository.subscriptions.get(input.endpoint)?.revokedAt,
    ).toBeTruthy();
  });

  it("retains a subscription after a temporary provider error", async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const provider = sender({
      status: "FAILED",
      reason: "TEMPORARY_FAILURE",
    });
    const register = new RegisterPushSubscriptionUseCase(repository);
    const sendTest = new SendTestPushUseCase(repository, provider);
    const input = subscriptionInput(
      "https://fcm.googleapis.com/fcm/send/device-a",
    );
    await register.execute("user-a", input);

    expect(
      await sendTest.execute("user-a", { endpoint: input.endpoint }),
    ).toEqual({ status: "FAILED" });
    expect(repository.subscriptions.get(input.endpoint)?.revokedAt).toBeNull();
  });
});
