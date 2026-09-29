import { describe, expect, it } from "vitest";
import { ReadingSession, type MoodValue } from "./reading-session";

describe("ReadingSession domain entity", () => {
  const baseProps = {
    id: "session-1",
    userId: "user-1",
    bookId: "book-1",
    startPage: 0,
    endPage: 10,
    pagesRead: 10,
    mood: "FOCUSED" as MoodValue,
    readAt: new Date("2024-01-15T10:00:00Z"),
    createdAt: new Date("2024-01-15T10:00:00Z"),
  };

  describe("create", () => {
    it("creates a valid reading session", () => {
      const session = ReadingSession.create(baseProps);
      expect(session.id).toBe("session-1");
      expect(session.startPage).toBe(0);
      expect(session.endPage).toBe(10);
      expect(session.pagesRead).toBe(10);
      expect(session.mood).toBe("FOCUSED");
    });

    it("throws when startPage is negative", () => {
      expect(() =>
        ReadingSession.create({ ...baseProps, startPage: -1 }),
      ).toThrow("Start page must be non-negative");
    });

    it("throws when endPage is not greater than startPage", () => {
      expect(() => ReadingSession.create({ ...baseProps, endPage: 0 })).toThrow(
        "End page must be greater than start page",
      );
      expect(() =>
        ReadingSession.create({ ...baseProps, endPage: -5 }),
      ).toThrow("End page must be greater than start page");
    });

    it("throws when pagesRead doesn't match endPage - startPage", () => {
      expect(() =>
        ReadingSession.create({ ...baseProps, pagesRead: 5 }),
      ).toThrow("Pages read must equal end page minus start page");
    });

    it("accepts null mood", () => {
      const session = ReadingSession.create({ ...baseProps, mood: null });
      expect(session.mood).toBeNull();
    });

    it("accepts all valid mood values", () => {
      const moods = [
        "FOCUSED",
        "RELAXED",
        "ENERGIZED",
        "DISTRACTED",
        "TIRED",
      ] as const;

      for (const mood of moods) {
        const session = ReadingSession.create({ ...baseProps, mood });
        expect(session.mood).toBe(mood);
      }
    });
  });

  describe("reconstitute", () => {
    it("recreates a session from persistence data", () => {
      const session = ReadingSession.reconstitute(baseProps);
      expect(session.id).toBe("session-1");
      expect(session.pagesRead).toBe(10);
    });
  });

  describe("toPersistence", () => {
    it("returns a copy of the props (except createdAt which is overwritten)", () => {
      const session = ReadingSession.create(baseProps);
      const props = session.toPersistence();
      // createdAt is overwritten in create(), so we check all except createdAt
      expect(props.id).toBe(baseProps.id);
      expect(props.userId).toBe(baseProps.userId);
      expect(props.bookId).toBe(baseProps.bookId);
      expect(props.startPage).toBe(baseProps.startPage);
      expect(props.endPage).toBe(baseProps.endPage);
      expect(props.pagesRead).toBe(baseProps.pagesRead);
      expect(props.mood).toBe(baseProps.mood);
      expect(props.readAt).toEqual(baseProps.readAt);
      expect(props).not.toBe(baseProps); // Should be a copy
    });
  });

  describe("getters", () => {
    it("exposes all properties correctly", () => {
      const session = ReadingSession.create(baseProps);
      expect(session.id).toBe("session-1");
      expect(session.userId).toBe("user-1");
      expect(session.bookId).toBe("book-1");
      expect(session.startPage).toBe(0);
      expect(session.endPage).toBe(10);
      expect(session.pagesRead).toBe(10);
      expect(session.mood).toBe("FOCUSED");
      expect(session.readAt).toEqual(new Date("2024-01-15T10:00:00Z"));
      // createdAt is overwritten in create(), so we just check it's a Date
      expect(session.createdAt).toBeInstanceOf(Date);
    });
  });
});
