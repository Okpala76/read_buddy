import { EpubReader } from "./EpubReader";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  load: vi.fn(),
  state: vi.fn(),
  save: vi.fn(),
  complete: vi.fn(),
  refresh: vi.fn(),
  next: vi.fn(),
  callback: null as
    null | ((v: { start: { cfi: string }; atEnd?: boolean }) => void),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: m.refresh }),
}));
vi.mock("./epub-position-actions", () => ({
  loadEpubPosition: m.load,
  getEpubReadingState: m.state,
  saveEpubPosition: m.save,
}));
vi.mock("./epub-reading-actions", () => ({ completeEpubReading: m.complete }));
vi.mock("@/features/streak-buddies/ui/nudge-actions", () => ({
  nudgeMyBuddies: vi.fn(),
}));
vi.mock("epubjs", () => ({
  default: () => ({
    ready: Promise.resolve(),
    destroy: vi.fn(),
    locations: {
      generate: vi.fn(),
      length: () => 100,
      locationFromCfi: (cfi: string) => (cfi === "epubcfi(start)" ? 0 : 59),
    },
    renderTo: () => ({
      on: (_event: string, callback: typeof m.callback) => {
        m.callback = callback;
      },
      display: () => {
        m.callback?.({ start: { cfi: "epubcfi(start)" } });
        return Promise.resolve();
      },
      next: () => {
        m.next();
        m.callback?.({ start: { cfi: "epubcfi(later)" } });
        return Promise.resolve();
      },
      prev: vi.fn(),
      destroy: vi.fn(),
    }),
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  m.load.mockResolvedValue(null);
  m.state.mockResolvedValue(null);
  m.save.mockResolvedValue(undefined);
  m.complete.mockResolvedValue({ celebration: null });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1),
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("saves bookmarks without credit and lets the user close without logging", async () => {
  const close = vi.fn();
  render(
    <EpubReader
      bookId={crypto.randomUUID()}
      url="https://example.test/book"
      fileName="Book"
      isReading
      onClose={close}
    />,
  );
  await screen.findByText(/Location 1 of 100/);
  expect(m.complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Finish / Close" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Close without logging" }),
  );
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(m.complete).not.toHaveBeenCalled();
});
it("confirms only the completed locations when finishing a session", async () => {
  const bookId = crypto.randomUUID(),
    close = vi.fn();
  render(
    <EpubReader
      bookId={bookId}
      url="https://example.test/book"
      fileName="Book"
      isReading
      onClose={close}
    />,
  );
  await screen.findByText(/Location 1 of 100/);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText(/Location 60 of 100/);
  fireEvent.click(screen.getByRole("button", { name: "Finish / Close" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Save reading and close" }),
  );
  await waitFor(() =>
    expect(m.complete).toHaveBeenCalledWith({
      bookId,
      locationIndex: 59,
      finished: false,
    }),
  );
  expect(close).toHaveBeenCalled();
});
