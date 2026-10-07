import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PushNotificationSettings } from "./PushNotificationSettings";

const actionMocks = vi.hoisted(() => ({
  register: vi.fn().mockResolvedValue({ enabled: true }),
  revoke: vi.fn().mockResolvedValue({ revoked: true }),
  sendTest: vi.fn().mockResolvedValue({ status: "SENT" }),
}));

vi.mock("./push-actions", () => ({
  registerPushSubscription: actionMocks.register,
  revokePushSubscription: actionMocks.revoke,
  sendTestPushNotification: actionMocks.sendTest,
}));

function createSubscription(applicationServerKey = new Uint8Array([1, 0, 1])) {
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/device-a",
    options: {
      applicationServerKey: applicationServerKey.buffer,
    },
    toJSON: () => ({
      endpoint: "https://fcm.googleapis.com/fcm/send/device-a",
      keys: {
        p256dh: "p256dh_key_value_123",
        auth: "auth_key_value_123",
      },
    }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  } as unknown as PushSubscription;
}

function configureBrowser({
  permission,
  existingSubscription = null,
}: {
  permission: NotificationPermission;
  existingSubscription?: PushSubscription | null;
}) {
  const subscribe = vi.fn().mockResolvedValue(createSubscription());
  const registration = {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(existingSubscription),
      subscribe,
    },
  } as unknown as ServiceWorkerRegistration;
  const requestPermission = vi.fn().mockResolvedValue("granted");

  Object.defineProperty(window, "PushManager", {
    configurable: true,
    value: class PushManager {},
  });
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission, requestPermission },
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    },
  });

  return { registration, requestPermission, subscribe };
}

describe("PushNotificationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("does not prompt again when notifications are blocked", async () => {
    const { requestPermission } = configureBrowser({ permission: "denied" });

    render(<PushNotificationSettings vapidPublicKey="AQAB" />);

    expect(
      await screen.findByText(/blocked in your browser settings/i),
    ).toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /enable notifications/i }),
    ).not.toBeInTheDocument();
  });

  it("requests permission only after the enable button is clicked", async () => {
    const { requestPermission, subscribe } = configureBrowser({
      permission: "default",
    });

    render(<PushNotificationSettings vapidPublicKey="AQAB" />);
    const button = await screen.findByRole("button", {
      name: /enable notifications/i,
    });
    expect(requestPermission).not.toHaveBeenCalled();

    fireEvent.click(button);

    await waitFor(() => expect(requestPermission).toHaveBeenCalledOnce());
    await waitFor(() => expect(subscribe).toHaveBeenCalledOnce());
    await waitFor(() => expect(actionMocks.register).toHaveBeenCalledOnce());
    expect(await screen.findByRole("status")).toHaveTextContent(
      /notifications are enabled on this device/i,
    );
  });

  it("restores an existing subscription without requesting permission", async () => {
    const existingSubscription = createSubscription();
    const { requestPermission } = configureBrowser({
      permission: "granted",
      existingSubscription,
    });

    render(<PushNotificationSettings vapidPublicKey="AQAB" />);

    expect(
      await screen.findByRole("button", { name: /send test notification/i }),
    ).toBeInTheDocument();
    expect(actionMocks.register).toHaveBeenCalledOnce();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("replaces a subscription created with an old VAPID key", async () => {
    const existingSubscription = createSubscription(new Uint8Array([2, 0, 2]));
    const { requestPermission, subscribe } = configureBrowser({
      permission: "granted",
      existingSubscription,
    });
    render(<PushNotificationSettings vapidPublicKey="AQAB" />);

    fireEvent.click(
      await screen.findByRole("button", { name: /enable notifications/i }),
    );

    await waitFor(() =>
      expect(existingSubscription.unsubscribe).toHaveBeenCalledOnce(),
    );
    expect(subscribe).toHaveBeenCalledOnce();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("shows browser-disabled state when server revocation is interrupted", async () => {
    const existingSubscription = createSubscription();
    configureBrowser({ permission: "granted", existingSubscription });
    actionMocks.revoke.mockRejectedValueOnce(new Error("network failure"));
    render(<PushNotificationSettings vapidPublicKey="AQAB" />);

    fireEvent.click(
      await screen.findByRole("button", { name: /disable notifications/i }),
    );

    expect(
      await screen.findByText(/server cleanup will finish automatically/i),
    ).toBeInTheDocument();
    expect(existingSubscription.unsubscribe).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: /enable notifications/i }),
    ).toBeInTheDocument();
  });
});
