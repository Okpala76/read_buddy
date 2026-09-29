import { describe, expect, it } from "vitest";
import { Book, BookStatus } from "./book";

describe("Book domain entity", () => {
  const baseProps = {
    id: "book-1",
    userId: "user-1",
    title: "Test Book",
    author: "Test Author",
    totalPages: 300,
    currentPage: 0,
    status: BookStatus.QUEUED,
    completedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  describe("create", () => {
    it("creates a valid queued book", () => {
      const book = Book.create(baseProps);
      expect(book.id).toBe("book-1");
      expect(book.status).toBe(BookStatus.QUEUED);
      expect(book.currentPage).toBe(0);
      expect(book.progressPercent).toBe(0);
      expect(book.pagesRemaining).toBe(300);
    });

    it("throws when totalPages is not positive", () => {
      expect(() => Book.create({ ...baseProps, totalPages: 0 })).toThrow(
        "Total pages must be positive",
      );
      expect(() => Book.create({ ...baseProps, totalPages: -1 })).toThrow(
        "Total pages must be positive",
      );
    });

    it("throws when currentPage is negative", () => {
      expect(() => Book.create({ ...baseProps, currentPage: -1 })).toThrow(
        "Current page must be between 0 and total pages",
      );
    });

    it("throws when currentPage exceeds totalPages", () => {
      expect(() => Book.create({ ...baseProps, currentPage: 301 })).toThrow(
        "Current page must be between 0 and total pages",
      );
    });

    it("throws when COMPLETED book has wrong currentPage", () => {
      expect(() =>
        Book.create({
          ...baseProps,
          status: BookStatus.COMPLETED,
          currentPage: 100,
          completedAt: new Date(),
        }),
      ).toThrow("Completed book must have current page equal to total pages");
    });

    it("throws when COMPLETED book has no completedAt", () => {
      expect(() =>
        Book.create({
          ...baseProps,
          status: BookStatus.COMPLETED,
          currentPage: 300,
          completedAt: null,
        }),
      ).toThrow("Completed book must have completion timestamp");
    });

    it("throws when non-COMPLETED book has completedAt", () => {
      expect(() =>
        Book.create({
          ...baseProps,
          status: BookStatus.QUEUED,
          completedAt: new Date(),
        }),
      ).toThrow("Non-completed book must not have completion timestamp");
    });
  });

  describe("startReading", () => {
    it("starts a queued book", () => {
      const book = Book.create(baseProps);
      const started = book.startReading();
      expect(started.status).toBe(BookStatus.READING);
      expect(started.isReading()).toBe(true);
      expect(started.updatedAt).not.toBe(book.updatedAt);
    });

    it("throws when starting a reading book", () => {
      const book = Book.create({ ...baseProps, status: BookStatus.READING });
      expect(() => book.startReading()).toThrow(
        "Only queued books can be started",
      );
    });

    it("throws when starting a completed book", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.COMPLETED,
        currentPage: 300,
        completedAt: new Date(),
      });
      expect(() => book.startReading()).toThrow(
        "Only queued books can be started",
      );
    });
  });

  describe("complete", () => {
    it("completes a reading book", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.READING,
        currentPage: 150,
      });
      const completed = book.complete();
      expect(completed.status).toBe(BookStatus.COMPLETED);
      expect(completed.currentPage).toBe(300);
      expect(completed.completedAt).not.toBeNull();
      expect(completed.isCompleted()).toBe(true);
    });

    it("throws when completing a queued book", () => {
      const book = Book.create(baseProps);
      expect(() => book.complete()).toThrow(
        "Only reading books can be completed",
      );
    });

    it("throws when completing a completed book", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.COMPLETED,
        currentPage: 300,
        completedAt: new Date(),
      });
      expect(() => book.complete()).toThrow(
        "Only reading books can be completed",
      );
    });
  });

  describe("updateProgress", () => {
    it("updates progress on a reading book", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.READING,
        currentPage: 50,
      });
      const updated = book.updateProgress(100);
      expect(updated.currentPage).toBe(100);
      expect(updated.updatedAt).not.toBe(book.updatedAt);
    });

    it("throws when updating progress on a queued book", () => {
      const book = Book.create(baseProps);
      expect(() => book.updateProgress(10)).toThrow(
        "Only reading books can have progress updated",
      );
    });

    it("throws when updating progress on a completed book", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.COMPLETED,
        currentPage: 300,
        completedAt: new Date(),
      });
      expect(() => book.updateProgress(10)).toThrow(
        "Only reading books can have progress updated",
      );
    });

    it("throws when new page is less than current", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.READING,
        currentPage: 100,
      });
      expect(() => book.updateProgress(50)).toThrow("Invalid page number");
    });

    it("throws when new page exceeds total", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.READING,
        currentPage: 100,
      });
      expect(() => book.updateProgress(301)).toThrow("Invalid page number");
    });

    it("auto-completes when reaching total pages", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.READING,
        currentPage: 299,
      });
      const updated = book.updateProgress(300);
      expect(updated.status).toBe(BookStatus.COMPLETED);
      expect(updated.currentPage).toBe(300);
      expect(updated.completedAt).not.toBeNull();
    });
  });

  describe("requeue", () => {
    it("requeues a reading book", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.READING,
        currentPage: 150,
      });
      const requeued = book.requeue();
      expect(requeued.status).toBe(BookStatus.QUEUED);
      expect(requeued.isQueued()).toBe(true);
    });

    it("requeues a completed book throws", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.COMPLETED,
        currentPage: 300,
        completedAt: new Date(),
      });
      expect(() => book.requeue()).toThrow(
        "Completed books cannot be requeued",
      );
    });
  });

  describe("progressPercent", () => {
    it("calculates progress correctly", () => {
      const book = Book.create({ ...baseProps, currentPage: 150 });
      expect(book.progressPercent).toBe(50);
    });

    it("returns 0 for 0 pages", () => {
      const book = Book.create({ ...baseProps, currentPage: 0 });
      expect(book.progressPercent).toBe(0);
    });

    it("returns 100 for completed", () => {
      const book = Book.create({
        ...baseProps,
        status: BookStatus.COMPLETED,
        currentPage: 300,
        completedAt: new Date(),
      });
      expect(book.progressPercent).toBe(100);
    });
  });

  describe("pagesRemaining", () => {
    it("calculates remaining pages", () => {
      const book = Book.create({ ...baseProps, currentPage: 100 });
      expect(book.pagesRemaining).toBe(200);
    });
  });
});
