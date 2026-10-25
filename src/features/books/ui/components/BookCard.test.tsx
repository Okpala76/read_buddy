import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BookStatus } from "@/features/books/domain";
import type { BookView } from "@/features/books/ui/book-view";
import { BookCard } from "./BookCard";

const {
  deleteBookMock,
  reopenCompletedBookMock,
  requeueBookMock,
  startBookMock,
} = vi.hoisted(() => ({
  deleteBookMock: vi.fn(),
  reopenCompletedBookMock: vi.fn(),
  requeueBookMock: vi.fn(),
  startBookMock: vi.fn(),
}));

vi.mock("@/features/books/ui/book-actions", () => ({
  deleteBook: deleteBookMock,
  reopenCompletedBook: reopenCompletedBookMock,
  requeueBook: requeueBookMock,
  startBook: startBookMock,
}));

vi.mock("@/features/book-documents/ui/epub-position-actions", () => ({
  loadEpubPosition: vi.fn(),
  saveEpubPosition: vi.fn(),
}));

vi.mock("@/features/book-documents/ui/document-actions", () => ({
  beginDocumentUpload: vi.fn(),
  completeDocumentUpload: vi.fn(),
  getDocumentDownload: vi.fn(),
}));

const baseBook: BookView = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  title: "Test Book",
  author: "Test Author",
  totalPages: 300,
  currentPage: 100,
  status: BookStatus.READING,
  completedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  progressPercent: 33,
};

describe("BookCard", () => {
  beforeEach(() => {
    deleteBookMock.mockReset().mockResolvedValue(undefined);
    reopenCompletedBookMock
      .mockReset()
      .mockResolvedValue({ status: "reading" });
    requeueBookMock.mockReset().mockResolvedValue(undefined);
    startBookMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it("routes reading progress through the reading log", () => {
    render(<BookCard book={baseBook} isCurrentReading />);

    expect(screen.getByRole("link", { name: "Log reading" })).toHaveAttribute(
      "href",
      "/sessions",
    );
    expect(
      screen.queryByRole("button", { name: /increment page/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /finish book/i }),
    ).not.toBeInTheDocument();
  });

  it("removes an active book after confirmation", async () => {
    render(<BookCard book={baseBook} isCurrentReading />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Test Book from library",
      }),
    );
    expect(
      screen.getByText(/Reading sessions you already logged/),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Remove book" }));

    await waitFor(() =>
      expect(deleteBookMock).toHaveBeenCalledWith({ bookId: baseBook.id }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("keeps the removal dialog open on a server failure", async () => {
    deleteBookMock.mockRejectedValueOnce(
      new Error("Could not remove this book"),
    );
    render(<BookCard book={baseBook} isCurrentReading />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Test Book from library",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove book" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not remove this book",
    );
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });

  it("moves the active book back to the queue", async () => {
    render(<BookCard book={baseBook} isCurrentReading />);

    fireEvent.click(screen.getByRole("button", { name: "Move to queue" }));

    await waitFor(() =>
      expect(requeueBookMock).toHaveBeenCalledWith({ bookId: baseBook.id }),
    );
  });

  it("starts a queued book when there is no active book", async () => {
    const queuedBook = {
      ...baseBook,
      currentPage: 0,
      status: BookStatus.QUEUED,
      progressPercent: 0,
    };
    render(<BookCard book={queuedBook} />);

    fireEvent.click(screen.getByRole("button", { name: "Start reading" }));

    await waitFor(() =>
      expect(startBookMock).toHaveBeenCalledWith({ bookId: baseBook.id }),
    );
  });

  it("prevents starting a queued book while another book is active", () => {
    const queuedBook = {
      ...baseBook,
      currentPage: 0,
      status: BookStatus.QUEUED,
      progressPercent: 0,
    };
    render(<BookCard book={queuedBook} hasCurrentReading />);

    const startButton = screen.getByRole("button", { name: "Start reading" });
    expect(startButton).toBeDisabled();

    fireEvent.click(startButton);
    expect(startBookMock).not.toHaveBeenCalled();
  });

  it("keeps reopen open when the resume page is invalid", async () => {
    const completedBook = {
      ...baseBook,
      currentPage: 300,
      status: BookStatus.COMPLETED,
      completedAt: new Date("2026-01-02T00:00:00.000Z"),
      progressPercent: 100,
    };
    render(<BookCard book={completedBook} />);

    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    fireEvent.change(screen.getByLabelText("Resume page"), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reopen book" }));

    expect(
      await screen.findByText("Enter a page between 0 and 299"),
    ).toBeVisible();
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(reopenCompletedBookMock).not.toHaveBeenCalled();
  });

  it("closes reopen only after the completed book is reopened", async () => {
    const completedBook = {
      ...baseBook,
      currentPage: 300,
      status: BookStatus.COMPLETED,
      completedAt: new Date("2026-01-02T00:00:00.000Z"),
      progressPercent: 100,
    };
    render(<BookCard book={completedBook} />);

    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    fireEvent.change(screen.getByLabelText("Resume page"), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reopen book" }));

    await waitFor(() =>
      expect(reopenCompletedBookMock).toHaveBeenCalledWith({
        bookId: baseBook.id,
        resumePage: 250,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });
});
