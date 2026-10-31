import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  read: vi.fn(),
  ensure: vi.fn(),
  mark: vi.fn(),
  react: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({ requireAuth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../infrastructure/panel-repository", () => ({
  readPanel: mocks.read,
  ensureReadingReminder: mocks.ensure,
  markPanelItemRead: mocks.mark,
}));
vi.mock("../infrastructure/notification-repository", () => ({
  updateNotification: mocks.react,
}));
import {
  changeNotification,
  getNotificationCenter,
} from "./notification-actions";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "viewer", timezone: "UTC" });
});
it("authenticates before accessing private activity", async () => {
  mocks.auth.mockRejectedValue(new Error("Unauthorized"));
  await expect(getNotificationCenter()).rejects.toThrow("Unauthorized");
  await expect(changeNotification({})).rejects.toThrow("Unauthorized");
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.mark).not.toHaveBeenCalled();
});
it("rejects malformed IDs, unsupported reactions and unbounded page sizes", async () => {
  await expect(
    changeNotification({ id: "fake", kind: "NUDGE" }),
  ).rejects.toThrow();
  await expect(
    changeNotification({
      id: crypto.randomUUID(),
      kind: "NUDGE",
      reaction: "hello",
    }),
  ).rejects.toThrow();
  await expect(getNotificationCenter({ limit: 501 })).rejects.toThrow();
  expect(mocks.react).not.toHaveBeenCalled();
});
it("uses the authenticated owner for read state and reactions", async () => {
  const id = crypto.randomUUID();
  await changeNotification({ id, kind: "FRIEND_INVITE", userId: "forged" });
  expect(mocks.mark).toHaveBeenCalledWith("viewer", id, "FRIEND_INVITE");
  await changeNotification({ id, kind: "NUDGE", reaction: "👏" });
  expect(mocks.react).toHaveBeenCalledWith("viewer", {
    id,
    kind: "NUDGE",
    reaction: "👏",
  });
  await expect(
    changeNotification({ id, kind: "MILESTONE", reaction: "👏" }),
  ).rejects.toThrow("Only received");
});
it("loads the scoped panel after materializing due reading activity", async () => {
  await getNotificationCenter({ limit: 100 });
  expect(mocks.ensure).toHaveBeenCalledWith({ id: "viewer", timezone: "UTC" });
  expect(mocks.read).toHaveBeenCalledWith("viewer", 100);
});
