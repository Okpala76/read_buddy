import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  begin: vi.fn(),
  complete: vi.fn(),
  download: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("./document-actions", () => ({
  beginDocumentUpload: m.begin,
  completeDocumentUpload: m.complete,
  getDocumentDownload: m.download,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: m.refresh }),
}));
vi.mock("./PdfReader", () => ({ PdfReader: () => <div>PDF reader</div> }));
vi.mock("./EpubReader", () => ({ EpubReader: () => <div>EPUB reader</div> }));
import { BookDocumentControl } from "./BookDocumentControl";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("offers attachment only when a book has no document", () => {
  render(<BookDocumentControl bookId="book" />);
  expect(screen.getByLabelText("Attach PDF / EPUB")).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: /Open/ }),
  ).not.toBeInTheDocument();
  expect(m.download).not.toHaveBeenCalled();
});
it("offers opening an existing PDF even before its reading state exists", async () => {
  m.download.mockResolvedValue({
    url: "https://example.test/book",
    contentType: "application/pdf",
    fileName: "book.pdf",
  });
  render(<BookDocumentControl bookId="book" documentFormat="PDF" />);
  expect(screen.queryByLabelText("Attach PDF / EPUB")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open PDF" }));
  expect(await screen.findByText("PDF reader")).toBeVisible();
});
it("switches from attach to open immediately after a successful upload", async () => {
  m.begin.mockResolvedValue({
    uploadUrl: "https://example.test/upload",
    headers: {},
    uploadToken: "token",
  });
  m.complete.mockResolvedValue({ documentId: "document" });
  render(<BookDocumentControl bookId="book" />);
  fireEvent.change(screen.getByLabelText("Attach PDF / EPUB"), {
    target: {
      files: [new File(["pdf"], "book.pdf", { type: "application/pdf" })],
    },
  });
  expect(await screen.findByRole("button", { name: "Open PDF" })).toBeEnabled();
  expect(screen.queryByLabelText("Attach PDF / EPUB")).not.toBeInTheDocument();
  await waitFor(() => expect(m.refresh).toHaveBeenCalledOnce());
});
it("keeps attachment available after failure", async () => {
  m.begin.mockRejectedValue(new Error("Upload unavailable"));
  render(<BookDocumentControl bookId="book" />);
  fireEvent.change(screen.getByLabelText("Attach PDF / EPUB"), {
    target: {
      files: [new File(["pdf"], "book.pdf", { type: "application/pdf" })],
    },
  });
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Upload unavailable",
  );
  expect(
    screen.queryByRole("button", { name: /Open/ }),
  ).not.toBeInTheDocument();
});

it("recovers a stale attachment with a helpful message and an attach action", async () => {
  m.download.mockResolvedValue(null);
  render(<BookDocumentControl bookId="book" documentFormat="PDF" />);
  fireEvent.click(screen.getByRole("button", { name: "Open PDF" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "No digital book attached yet",
  );
  expect(screen.getByLabelText("Attach PDF / EPUB")).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Open PDF" }),
  ).not.toBeInTheDocument();
});
