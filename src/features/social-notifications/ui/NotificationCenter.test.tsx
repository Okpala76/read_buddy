import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  save: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("./notification-actions", () => ({
  changeNotification: mocks.update,
  saveSocialPreferences: mocks.save,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
import { NotificationCenter } from "./NotificationCenter";
const item = {
  id: crypto.randomUUID(),
  kind: "NUDGE" as const,
  name: "Reader",
  days: null,
  createdAt: "2026-10-31T10:00:00Z",
  read: false,
  reaction: null,
};
const settings = { receiveNudges: true, shareMilestones: true };
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.update.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
});
it("shows both delivery types and marks a notification read", async () => {
  render(
    <NotificationCenter
      notifications={[
        item,
        { ...item, id: crypto.randomUUID(), kind: "CONGRATULATION", days: 10 },
      ]}
      settings={settings}
      invitations={1}
    />,
  );
  expect(screen.getByText(/Congratulations on 10 consecutive/)).toBeVisible();
  fireEvent.click(screen.getAllByRole("button", { name: "Mark as read" })[0]);
  await waitFor(() => expect(screen.getByText(/1 unread/)).toBeVisible());
  expect(mocks.update).toHaveBeenCalledWith({ id: item.id, kind: "NUDGE" });
});
it("sends only the selected allowed emoji on click", async () => {
  render(
    <NotificationCenter
      notifications={[item]}
      settings={settings}
      invitations={0}
    />,
  );
  expect(mocks.update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "React 👏 to Reader" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Reaction sent.");
  expect(
    screen.getByRole("button", { name: "React 👏 to Reader" }),
  ).toHaveAttribute("aria-pressed", "true");
});
it("saves explicit privacy choices and shows failures without claiming success", async () => {
  mocks.save.mockRejectedValueOnce(new Error("Could not save"));
  render(
    <NotificationCenter
      notifications={[]}
      settings={settings}
      invitations={0}
    />,
  );
  fireEvent.click(
    screen.getByLabelText("Receive daily nudges from streak buddies"),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Save privacy settings" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
  expect(mocks.save).toHaveBeenCalledWith({
    receiveNudges: false,
    shareMilestones: true,
  });
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
