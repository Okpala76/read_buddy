import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InstalledPushActivation } from "./InstalledPushActivation";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({ userId: "test-user" })),
  usePwaInstall: vi.fn(() => ({ installed: true, ready: true, platform: "ios-safari" })),
  supportsWebPush: vi.fn(() => true),
  subscriptionUsesVapidKey: vi.fn(() => true),
  permissionRequest: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/features/pwa/ui/PwaInstallProvider", () => ({
  usePwaInstall: mocks.usePwaInstall,
}));
vi.mock("./push-browser", () => ({
  supportsWebPush: mocks.supportsWebPush,
  subscriptionUsesVapidKey: mocks.subscriptionUsesVapidKey,
}));
vi.mock("./PushNotificationSettings", () => ({
  PushNotificationSettings: () => <div>Existing notification controls</div>,
}));

function configure({
  permission = "default",
  subscription = null,
}: {
  permission?: NotificationPermission;
  subscription?: PushSubscription | null;
} = {}) {
  const getSubscription = vi.fn().mockResolvedValue(subscription);
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission, requestPermission: mocks.permissionRequest },
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: { getSubscription },
      }),
    },
  });
  return { getSubscription };
}

describe("installed PWA notification activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    configure();
  });
  afterEach(cleanup);

  it("prompts on installed iPhone launch without automatically requesting OS permission", async () => {
    render(<InstalledPushActivation vapidPublicKey="AQAB" />);
    expect(await screen.findByText("Get your reading reminders")).toBeVisible();
    expect(screen.getByText("Existing notification controls")).toBeVisible();
    expect(mocks.permissionRequest).not.toHaveBeenCalled();
  });

  it("keeps regular browser users out of the activation flow", async () => {
    mocks.usePwaInstall.mockReturnValueOnce({
      installed: false, ready: true, platform: "ios-safari",
    });
    render(<InstalledPushActivation vapidPublicKey="AQAB" />);
    expect(screen.queryByText("Get your reading reminders")).not.toBeInTheDocument();
  });

  it("does not prompt an already-subscribed installed app", async () => {
    const { getSubscription } = configure({
      permission: "granted",
      subscription: { endpoint: "https://example.test" } as PushSubscription,
    });
    render(<InstalledPushActivation vapidPublicKey="AQAB" />);
    await waitFor(() => expect(getSubscription).toHaveBeenCalledOnce());
    expect(screen.queryByText("Get your reading reminders")).not.toBeInTheDocument();
  });

  it("does not prompt users who blocked OS notifications", () => {
    configure({ permission: "denied" });
    render(<InstalledPushActivation vapidPublicKey="AQAB" />);
    expect(screen.queryByText("Get your reading reminders")).not.toBeInTheDocument();
  });

  it("respects dismissal on subsequent mounts while leaving Reminders accessible", async () => {
    const view = render(<InstalledPushActivation vapidPublicKey="AQAB" />);
    fireEvent.click(await screen.findByRole("button", { name: "Not now / Done" }));
    expect(screen.queryByText("Get your reading reminders")).not.toBeInTheDocument();
    view.unmount();
    render(<InstalledPushActivation vapidPublicKey="AQAB" />);
    expect(screen.queryByText("Get your reading reminders")).not.toBeInTheDocument();
  });
});
