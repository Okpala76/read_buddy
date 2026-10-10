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
  completeBookMock,
  deleteBookMock,
  reopenCompletedBookMock,
  startBookMock,
  updateBookProgressMock,
} = vi.hoisted(() => ({
  completeBookMock: vi.fn(),
  deleteBookMock: vi.fn(),
  reopenCompletedBookMock: vi.fn(),
  startBookMock: vi.fn(),
  updateBookProgressMock: vi.fn(),
}));

vi.mock("@/features/books/ui/book-actions", () => ({
  completeBook: completeBookMock,
  deleteBook: deleteBookMock,
  reopenCompletedBook: reopenCompletedBookMock,
  startBook: startBookMock,
  updateBookProgress: updateBookProgressMock,
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
    completeBookMock.mockReset().mockResolvedValue(undefined);
    deleteBookMock.mockReset().mockResolvedValue(undefined);
    reopenCompletedBookMock
      .mockReset()
      .mockResolvedValue({ status: "reading" });
    startBookMock.mockReset().mockResolvedValue(undefined);
    updateBookProgressMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it("increments a non-final page without confirmation", async () => {
    render(<BookCard book={baseBook} />);

    fireEvent.click(screen.getByRole("button", { name: "Increment page" }));

    await waitFor(() =>
      expect(updateBookProgressMock).toHaveBeenCalledWith({
        bookId: baseBook.id,
        page: 101,
      }),
    );
  });

  it("requires confirmation before the final page increment", async () => {
    const finalPageBook = {
      ...baseBook,
      currentPage: 299,
      progressPercent: 100,
    };
    render(<BookCard book={finalPageBook} />);

    fireEvent.click(screen.getByRole("button", { name: "Finish book" }));

    expect(updateBookProgressMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, mark finished" }));

    await waitFor(() =>
      expect(updateBookProgressMock).toHaveBeenCalledWith({
        bookId: baseBook.id,
        page: 300,
      }),
    );
  });

  it("requires confirmation before explicitly finishing a book", async () => {
    render(<BookCard book={baseBook} />);

    fireEvent.click(screen.getByText("Finish book…"));

    expect(completeBookMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, mark finished" }));

    await waitFor(() =>
      expect(completeBookMock).toHaveBeenCalledWith({ bookId: baseBook.id }),
    );
  });

  it("keeps undo open when the resume page is invalid", async () => {
    const completedBook = {
      ...baseBook,
      currentPage: 300,
      status: BookStatus.COMPLETED,
      completedAt: new Date("2026-01-02T00:00:00.000Z"),
      progressPercent: 100,
    };
    render(<BookCard book={completedBook} />);

    fireEvent.click(screen.getByRole("button", { name: "Undo completion" }));
    fireEvent.change(screen.getByLabelText("Resume page"), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(
      await screen.findByText("Enter a page between 0 and 299"),
    ).toBeVisible();
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(reopenCompletedBookMock).not.toHaveBeenCalled();
  });

  it("closes undo only after the completed book is reopened", async () => {
    const completedBook = {
      ...baseBook,
      currentPage: 300,
      status: BookStatus.COMPLETED,
      completedAt: new Date("2026-01-02T00:00:00.000Z"),
      progressPercent: 100,
    };
    render(<BookCard book={completedBook} />);

    fireEvent.click(screen.getByRole("button", { name: "Undo completion" }));
    fireEvent.change(screen.getByLabelText("Resume page"), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

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

  it("keeps undo open when reopening fails", async () => {
    reopenCompletedBookMock.mockRejectedValue(
      new Error("Reading sessions exist up to page 275"),
    );
    const completedBook = {
      ...baseBook,
      currentPage: 300,
      status: BookStatus.COMPLETED,
      completedAt: new Date("2026-01-02T00:00:00.000Z"),
      progressPercent: 100,
    };
    render(<BookCard book={completedBook} />);

    fireEvent.click(screen.getByRole("button", { name: "Undo completion" }));
    fireEvent.change(screen.getByLabelText("Resume page"), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(
      await screen.findByText("Reading sessions exist up to page 275"),
    ).toBeVisible();
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });
});
