import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  begin: vi.fn(),
  inspect: vi.fn(),
  finish: vi.fn(),
  discard: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({ requireAuth: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../infrastructure/digital-book-repository", () => ({
  beginDigitalUpload: m.begin,
  inspectDigitalUpload: m.inspect,
  finalizeDigitalUpload: m.finish,
  discardDigitalUpload: m.discard,
}));
import {
  beginDigitalBook,
  inspectDigitalBook,
  completeDigitalBook,
  cancelDigitalBook,
} from "./digital-book-actions";
beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ id: "owner" });
});
it("requires authentication for every upload stage", async () => {
  m.auth.mockRejectedValue(new Error("Unauthorized"));
  for (const action of [
    beginDigitalBook,
    inspectDigitalBook,
    completeDigitalBook,
    cancelDigitalBook,
  ])
    await expect(action({})).rejects.toThrow("Unauthorized");
  expect(m.begin).not.toHaveBeenCalled();
});
it("validates file limits and extensions before issuing upload access", async () => {
  await expect(
    beginDigitalBook({
      fileName: "bad.exe",
      contentType: "application/pdf",
      sizeBytes: 50,
    }),
  ).rejects.toThrow();
  await expect(
    beginDigitalBook({
      fileName: "a.pdf",
      contentType: "application/pdf",
      sizeBytes: 60 * 1024 * 1024,
    }),
  ).rejects.toThrow();
  expect(m.begin).not.toHaveBeenCalled();
  await beginDigitalBook({
    fileName: "a.pdf",
    contentType: "application/pdf",
    sizeBytes: 100,
    userId: "forged",
  });
  expect(m.begin).toHaveBeenCalledWith("owner", {
    fileName: "a.pdf",
    contentType: "application/pdf",
    sizeBytes: 100,
  });
});
it("accepts edited details while deriving ownership from the session", async () => {
  const uploadId = crypto.randomUUID();
  await completeDigitalBook({
    uploadId,
    title: "  Edited  ",
    author: "",
    startNow: false,
    userId: "forged",
    pageCount: 999,
  });
  expect(m.finish).toHaveBeenCalledWith("owner", {
    uploadId,
    title: "Edited",
    author: "",
    startNow: false,
  });
  await inspectDigitalBook({ uploadId });
  expect(m.inspect).toHaveBeenCalledWith("owner", uploadId);
});
