import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  read: vi.fn(),
  settings: vi.fn(),
  update: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({ requireAuth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../infrastructure/notification-repository", () => ({
  readNotifications: mocks.read,
  readSocialPreferences: mocks.settings,
  updateNotification: mocks.update,
  writeSocialPreferences: mocks.save,
}));
import {
  changeNotification,
  getNotificationCenter,
  saveSocialPreferences,
} from "./notification-actions";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "viewer" });
});
it("authenticates before reading or mutating private activity", async () => {
  mocks.auth.mockRejectedValue(new Error("Unauthorized"));
  await expect(getNotificationCenter()).rejects.toThrow("Unauthorized");
  await expect(changeNotification({})).rejects.toThrow("Unauthorized");
  await expect(saveSocialPreferences({})).rejects.toThrow("Unauthorized");
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.save).not.toHaveBeenCalled();
});
it("rejects malformed IDs, arbitrary messages and unsupported reactions", async () => {
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
  expect(mocks.update).not.toHaveBeenCalled();
});
it("ignores forged user IDs and validates boolean privacy settings", async () => {
  const id = crypto.randomUUID();
  await changeNotification({
    id,
    kind: "NUDGE",
    reaction: "👏",
    userId: "someone-else",
  });
  expect(mocks.update).toHaveBeenCalledWith("viewer", {
    id,
    kind: "NUDGE",
    reaction: "👏",
  });
  await expect(
    saveSocialPreferences({ receiveNudges: "false", shareMilestones: true }),
  ).rejects.toThrow();
  await saveSocialPreferences({
    receiveNudges: false,
    shareMilestones: false,
    userId: "forged",
  });
  expect(mocks.save).toHaveBeenCalledWith("viewer", {
    receiveNudges: false,
    shareMilestones: false,
  });
});
it("reads both settings and notifications for the authenticated user", async () => {
  mocks.read.mockResolvedValue([]);
  mocks.settings.mockResolvedValue({
    receiveNudges: true,
    shareMilestones: true,
  });
  await getNotificationCenter();
  expect(mocks.read).toHaveBeenCalledWith("viewer");
  expect(mocks.settings).toHaveBeenCalledWith("viewer");
});
