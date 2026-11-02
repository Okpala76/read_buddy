import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  save: vi.fn(),
  celebrate: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({ requireAuth: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../infrastructure/epub-reading-repository", () => ({
  completeEpubSession: m.save,
}));
vi.mock("@/features/reading/ui/daily-celebration", () => ({
  celebrationForSavedSession: m.celebrate,
}));
import { completeEpubReading } from "./epub-reading-actions";
beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ id: "owner", timezone: "UTC" });
  m.save.mockResolvedValue({ sessionId: null, locationsRead: 0 });
});
it("authenticates and validates before writing", async () => {
  m.auth.mockRejectedValueOnce(new Error("Unauthorized"));
  await expect(completeEpubReading({})).rejects.toThrow("Unauthorized");
  await expect(
    completeEpubReading({ bookId: crypto.randomUUID(), locationIndex: -1 }),
  ).rejects.toThrow();
  expect(m.save).not.toHaveBeenCalled();
});
it("ignores forged ownership and makes duplicate saves celebration-free", async () => {
  const bookId = crypto.randomUUID();
  await completeEpubReading({ bookId, locationIndex: 20, userId: "forged" });
  expect(m.save).toHaveBeenCalledWith("owner", {
    bookId,
    locationIndex: 20,
    finished: false,
  });
  expect(m.celebrate).not.toHaveBeenCalled();
});
