import type { RegisterPushSubscriptionInput } from "@/features/push-notifications/application";

export function vapidPublicKeyToBuffer(publicKey: string): ArrayBuffer {
  const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
  const base64 = `${publicKey}${padding}`
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const decoded = window.atob(base64);
  const bytes = Uint8Array.from(decoded, (character) =>
    character.charCodeAt(0),
  );

  return bytes.buffer;
}

export function subscriptionUsesVapidKey(
  subscription: PushSubscription,
  publicKey: string,
): boolean {
  const subscriptionKey = subscription.options.applicationServerKey;
  if (!subscriptionKey) return false;

  const expected = new Uint8Array(vapidPublicKeyToBuffer(publicKey));
  const actual = new Uint8Array(subscriptionKey);
  return (
    expected.length === actual.length &&
    expected.every((value, index) => value === actual[index])
  );
}

export function serializePushSubscription(
  subscription: PushSubscription,
): RegisterPushSubscriptionInput {
  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;

  if (!serialized.endpoint || !p256dh || !auth) {
    throw new Error("Browser returned an incomplete push subscription");
  }

  return {
    endpoint: serialized.endpoint,
    keys: { p256dh, auth },
    userAgent: navigator.userAgent || null,
  };
}

export function supportsWebPush(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
