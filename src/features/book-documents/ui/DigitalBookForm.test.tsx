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
  inspect: vi.fn(),
  finish: vi.fn(),
  cancel: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("./digital-book-actions", () => ({
  beginDigitalBook: m.begin,
  inspectDigitalBook: m.inspect,
  completeDigitalBook: m.finish,
  cancelDigitalBook: m.cancel,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: m.refresh }),
}));
import { DigitalBookForm } from "./DigitalBookForm";
const uploadId = crypto.randomUUID();
beforeEach(() => {
  vi.resetAllMocks();
  m.begin.mockResolvedValue({
    uploadId,
    url: "https://storage.example/upload",
    headers: { "Content-Type": "application/pdf" },
  });
  m.inspect.mockResolvedValue({
    title: "Detected title",
    author: "Detected author",
    pageCount: 12,
  });
  m.finish.mockResolvedValue({ bookId: uploadId });
  m.cancel.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("uploads first, reviews metadata and saves edited details", async () => {
  const done = vi.fn();
  render(
    <DigitalBookForm format="PDF" hasCurrentReading={false} onSaved={done} />,
  );
  fireEvent.change(screen.getByLabelText("Choose PDF file"), {
    target: {
      files: [new File(["pdf"], "book.pdf", { type: "application/pdf" })],
    },
  });
  const title = await screen.findByLabelText("Book title");
  expect(title).toHaveValue("Detected title");
  expect(screen.getByText(/12 PDF pages detected/)).toBeVisible();
  fireEvent.change(title, { target: { value: "Edited title" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to library" }));
  await waitFor(() =>
    expect(m.finish).toHaveBeenCalledWith({
      uploadId,
      title: "Edited title",
      author: "Detected author",
      startNow: true,
    }),
  );
  expect(done).toHaveBeenCalledOnce();
});
it("does not ask for paper pages for EPUB and queues behind an active book", async () => {
  m.inspect.mockResolvedValue({ title: "EPUB", author: "", pageCount: null });
  render(<DigitalBookForm format="EPUB" hasCurrentReading onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Choose EPUB file"), {
    target: { files: [new File(["zip"], "read.epub")] },
  });
  await screen.findByLabelText("Book title");
  expect(screen.queryByLabelText("Total pages")).not.toBeInTheDocument();
  expect(
    screen.getByRole("checkbox", { name: "Start reading now" }),
  ).toBeDisabled();
});
it("retains the reviewed upload after a failed save so retry uses the same ID", async () => {
  m.finish.mockRejectedValueOnce(new Error("Try again"));
  render(
    <DigitalBookForm
      format="PDF"
      hasCurrentReading={false}
      onSaved={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Choose PDF file"), {
    target: { files: [new File(["pdf"], "book.pdf")] },
  });
  await screen.findByLabelText("Book title");
  fireEvent.click(screen.getByRole("button", { name: "Add to library" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Try again");
  fireEvent.click(screen.getByRole("button", { name: "Add to library" }));
  await waitFor(() => expect(m.finish).toHaveBeenCalledTimes(2));
  expect(m.begin).toHaveBeenCalledOnce();
});

it("asks for a missing title while keeping detected pages and author", async () => {
  m.inspect.mockResolvedValue({ title: "", author: "Writer", pageCount: 12 });
  render(
    <DigitalBookForm
      format="PDF"
      hasCurrentReading={false}
      onSaved={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Choose PDF file"), {
    target: { files: [new File(["pdf"], "book.pdf")] },
  });
  const title = await screen.findByLabelText("Book title");
  expect(title).toHaveValue("");
  expect(screen.getByLabelText("Author (optional)")).toHaveValue("Writer");
  expect(screen.getByText(/12 PDF pages detected/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Add to library" })).toBeDisabled();
  fireEvent.change(title, { target: { value: "Manual title" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to library" }));
  await waitFor(() =>
    expect(m.finish).toHaveBeenCalledWith({
      uploadId,
      title: "Manual title",
      author: "Writer",
      startNow: true,
    }),
  );
});
it("shows an explicit inspection error without offering to save an unreadable file", async () => {
  m.inspect.mockResolvedValue({
    error: "This PDF requires a password. Upload an unlocked copy.",
  });
  render(
    <DigitalBookForm
      format="PDF"
      hasCurrentReading={false}
      onSaved={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Choose PDF file"), {
    target: { files: [new File(["pdf"], "book.pdf")] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "requires a password",
  );
  expect(
    screen.queryByRole("button", { name: "Add to library" }),
  ).not.toBeInTheDocument();
});
