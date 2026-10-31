import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LogReadingForm } from "./LogReadingForm";

const { logReadingMock, refreshMock } = vi.hoisted(() => ({
  logReadingMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/features/reading/ui/reading-actions", () => ({
  logReading: logReadingMock,
}));

const book = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  title: "A Long Read",
  author: "Someone",
  currentPage: 85,
  totalPages: 300,
};

afterEach(cleanup);

describe("LogReadingForm", () => {
  beforeEach(() => {
    logReadingMock.mockReset().mockResolvedValue({
      pagesRead: 15,
      newCurrentPage: 100,
      wasCompleted: false,
    });
    refreshMock.mockReset();
  });

  it("automatically previews pages read from the previous page", () => {
    render(<LogReadingForm currentBook={book} dailyTarget={20} />);

    expect(screen.getByText(/Last saved page: 85 of 300/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("What page did you stop at?"), {
      target: { value: "100" },
    });

    expect(screen.getByText("15 pages read")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save page 100" })).toBeEnabled();
  });

  it("submits only the ending page and confirms actual saved delta", async () => {
    render(<LogReadingForm currentBook={book} dailyTarget={20} />);
    fireEvent.change(screen.getByLabelText("What page did you stop at?"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save page 100" }));

    await waitFor(() =>
      expect(logReadingMock).toHaveBeenCalledWith({
        bookId: book.id,
        endPage: 100,
        mood: null,
      }),
    );
    expect(
      await screen.findByText(/15 pages logged\. You reached page 100/),
    ).toBeVisible();
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("shows first-day celebration and allows Maybe later", async () => {
    logReadingMock.mockResolvedValueOnce({
      pagesRead: 15,
      newCurrentPage: 100,
      wasCompleted: false,
      celebration: {
        bookTitle: "A Long Read", pagesRead: 15, streakDays: 3, source: "PHYSICAL",
      },
    });
    render(<LogReadingForm currentBook={book} dailyTarget={20} />);
    fireEvent.change(screen.getByLabelText("What page did you stop at?"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save page 100" }));
    expect(await screen.findByRole("dialog", { name: "Daily reading celebration" })).toBeVisible();
    expect(screen.getByText(/3-day reading streak/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Nudge my buddies/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Maybe later" }));
    expect(screen.queryByRole("dialog", { name: "Daily reading celebration" })).not.toBeInTheDocument();
  });

  it("does not show celebration for subsequent sessions", async () => {
    render(<LogReadingForm currentBook={book} dailyTarget={20} />);
    fireEvent.change(screen.getByLabelText("What page did you stop at?"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save page 100" }));
    await screen.findByText(/15 pages logged/);
    expect(screen.queryByRole("dialog", { name: "Daily reading celebration" })).not.toBeInTheDocument();
  });

  it("rejects a page that is not after the last saved page", () => {
    render(<LogReadingForm currentBook={book} dailyTarget={20} />);
    fireEvent.change(screen.getByLabelText("What page did you stop at?"), {
      target: { value: "85" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save reading" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /whole-number page after 85/,
    );
    expect(logReadingMock).not.toHaveBeenCalled();
  });

  it("confirms book completion at the final page", async () => {
    logReadingMock.mockResolvedValueOnce({
      pagesRead: 215,
      newCurrentPage: 300,
      wasCompleted: true,
    });
    render(<LogReadingForm currentBook={book} dailyTarget={20} />);
    fireEvent.change(screen.getByLabelText("What page did you stop at?"), {
      target: { value: "300" },
    });

    expect(screen.getByText(/Book complete!/)).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Log reading and finish book" }),
    );

    expect(await screen.findByText(/You finished A Long Read/)).toBeVisible();
  });
});
