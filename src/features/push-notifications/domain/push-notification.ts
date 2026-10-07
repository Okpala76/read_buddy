export interface PushNotificationPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export const TEST_PUSH_NOTIFICATION: PushNotificationPayload = {
  title: "Reading Buddy",
  body: "Notifications are working. We'll use them to help you stay consistent with your reading.",
  url: "/dashboard",
  tag: "reading-buddy-test",
};

const DEFAULT_PUSH_NOTIFICATION: PushNotificationPayload = {
  title: "Reading Buddy",
  body: "Open Reading Buddy to continue.",
  url: "/dashboard",
};

function normalizedText(
  value: unknown,
  fallback: string,
  maxLength: number,
): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

export function resolveNotificationUrl(
  candidate: unknown,
  origin: string,
): string {
  const fallback = new URL(DEFAULT_PUSH_NOTIFICATION.url, origin);

  if (typeof candidate !== "string" || !candidate.trim()) {
    return fallback.href;
  }

  try {
    const parsed = new URL(candidate.trim(), origin);
    return parsed.origin === fallback.origin ? parsed.href : fallback.href;
  } catch {
    return fallback.href;
  }
}

export function normalizePushNotificationPayload(
  value: unknown,
  origin: string,
): PushNotificationPayload {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const tag = normalizedText(record.tag, "", 100);

  return {
    title: normalizedText(record.title, DEFAULT_PUSH_NOTIFICATION.title, 100),
    body: normalizedText(record.body, DEFAULT_PUSH_NOTIFICATION.body, 240),
    url: resolveNotificationUrl(record.url, origin),
    ...(tag ? { tag } : {}),
  };
}
