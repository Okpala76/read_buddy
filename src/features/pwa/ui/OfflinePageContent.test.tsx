import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const navigate = vi.hoisted(() => vi.fn());
vi.mock("./offline-recovery", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./offline-recovery")>()),
  returnToApp: navigate,
}));
import { OfflinePageContent } from "./OfflinePageContent";
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("checks the server before returning to the saved app screen", async () => {
  sessionStorage.setItem("readon:last-path", "/books");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        reachable: true,
        nonce: new URL(url, "https://example.test").searchParams.get("nonce"),
      }),
    })),
  );
  render(<OfflinePageContent />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/books"));
  expect(
    screen.getByRole("button", { name: "Checking connection…" }),
  ).toBeDisabled();
});
it("keeps the user on the offline screen and allows retry on connection failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("No connection")));
  render(<OfflinePageContent />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No connection");
  expect(navigate).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
});
it("prevents duplicate checks and reacts to a real reconnect event", async () => {
  let resolve: (value: unknown) => void = () => {};
  const fetchMock = vi.fn(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<OfflinePageContent />);
  fireEvent(window, new Event("online"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  fireEvent(window, new Event("online"));
  expect(fetchMock).toHaveBeenCalledOnce();
  resolve({ ok: false });
  await screen.findByRole("alert");
  expect(navigate).not.toHaveBeenCalled();
});
it("does not mistake a cached or unrelated response for connectivity", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reachable: true, nonce: "old" }),
    }),
  );
  render(<OfflinePageContent />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not confirm",
  );
  expect(navigate).not.toHaveBeenCalled();
});
