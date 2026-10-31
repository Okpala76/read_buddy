import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn(), change: vi.fn() }));
vi.mock("./notification-actions", () => ({
  getNotificationCenter: mocks.read,
  changeNotification: mocks.change,
}));
import { NotificationPanel } from "./NotificationPanel";
const item = {
  id: crypto.randomUUID(),
  kind: "NUDGE" as const,
  name: "Reader",
  days: null,
  createdAt: "2026-10-31T10:00:00Z",
  read: false,
  reaction: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockResolvedValue({
    items: [item],
    unreadCount: 132,
    hasMore: true,
  });
  mocks.change.mockResolvedValue(undefined);
});
afterEach(cleanup);
it("shows the global badge and opens a panel without navigating", async () => {
  render(<NotificationPanel />);
  const bell = await screen.findByRole("button", {
    name: "Notifications, 132 unread",
  });
  expect(screen.getByText("99+")).toBeVisible();
  fireEvent.click(bell);
  expect(
    await screen.findByRole("dialog", { name: "Notifications" }),
  ).toBeVisible();
  expect(screen.getByText(/Reader is cheering/)).toBeVisible();
  expect(screen.queryByText("Save privacy settings")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(bell).toHaveFocus());
});
it("persists reads and emoji reactions through the existing authenticated actions", async () => {
  render(<NotificationPanel />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Notifications, 132 unread" }),
  );
  fireEvent.click(await screen.findByRole("button", { name: "Mark as read" }));
  await waitFor(() =>
    expect(mocks.change).toHaveBeenCalledWith({ id: item.id, kind: "NUDGE" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "React 👏 to Reader" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "React 👏 to Reader" }));
  await waitFor(() =>
    expect(mocks.change).toHaveBeenCalledWith({
      id: item.id,
      kind: "NUDGE",
      reaction: "👏",
    }),
  );
});
it("reports failures and lets the reader retry", async () => {
  mocks.read.mockRejectedValue(new Error("Unavailable"));
  render(<NotificationPanel />);
  fireEvent.click(
    screen.getByRole("button", { name: "Notifications, 0 unread" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not load notifications",
  );
  mocks.read.mockResolvedValue({
    items: [item],
    unreadCount: 1,
    hasMore: false,
  });
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByText(/Reader is cheering/)).toBeVisible();
});
