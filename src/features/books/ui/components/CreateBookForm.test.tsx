import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreateBookForm } from "./CreateBookForm";

const { createBookMock } = vi.hoisted(() => ({
  createBookMock: vi.fn(),
}));

vi.mock("@/features/books/ui/book-actions", () => ({
  createBook: createBookMock,
}));

afterEach(cleanup);

describe("CreateBookForm", () => {
  beforeEach(() => {
    createBookMock.mockReset().mockResolvedValue(undefined);
  });

  function openForm(hasCurrentReading = false) {
    render(<CreateBookForm hasCurrentReading={hasCurrentReading} />);
    fireEvent.click(screen.getByRole("button", { name: "Add book" }));
  }

  function fillBook() {
    fireEvent.change(screen.getByLabelText("Book title"), {
      target: { value: "A Long Read" },
    });
    fireEvent.change(screen.getByLabelText("Author"), {
      target: { value: "Someone" },
    });
    fireEvent.change(screen.getByLabelText("Total pages"), {
      target: { value: "300" },
    });
  }

  it("starts a fresh book at page zero when no book is active", async () => {
    openForm();
    fillBook();

    fireEvent.click(screen.getByRole("button", { name: "Add and start" }));

    await waitFor(() =>
      expect(createBookMock).toHaveBeenCalledWith({
        title: "A Long Read",
        author: "Someone",
        totalPages: 300,
        initialPage: 0,
        startNow: true,
      }),
    );
  });

  it("imports an existing reading position without fabricating logged pages", async () => {
    openForm();
    fillBook();
    fireEvent.click(screen.getByLabelText("Already reading this book"));
    fireEvent.change(screen.getByLabelText("Last page you finished"), {
      target: { value: "85" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add and start" }));

    await waitFor(() =>
      expect(createBookMock).toHaveBeenCalledWith({
        title: "A Long Read",
        author: "Someone",
        totalPages: 300,
        initialPage: 85,
        startNow: true,
      }),
    );
  });

  it("queues another book if one is already active", async () => {
    openForm(true);
    fillBook();
    fireEvent.click(screen.getByRole("button", { name: "Add to library" }));

    await waitFor(() =>
      expect(createBookMock).toHaveBeenCalledWith(
        expect.objectContaining({ startNow: false }),
      ),
    );
  });

  it("rejects a position beyond the final page", () => {
    openForm();
    fillBook();
    fireEvent.click(screen.getByLabelText("Already reading this book"));
    fireEvent.change(screen.getByLabelText("Last page you finished"), {
      target: { value: "300" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add and start" }));
    expect(screen.getByText(/last page you finished \(before the final page\)/i)).toBeVisible();
    expect(createBookMock).not.toHaveBeenCalled();
  });
});
