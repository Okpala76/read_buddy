import { describe, expect, it, vi, beforeEach } from "vitest";
import { GetAnalyticsUseCase } from "@/features/analytics/application";
import { ReadingSession } from "@/features/reading/domain";
import type { AnalyticsRepository } from "@/features/analytics/application";

describe("GetAnalyticsUseCase", () => {
  let repo: AnalyticsRepository;
  let useCase: GetAnalyticsUseCase;

  beforeEach(() => {
    repo = {
      findSessionsByUserId: vi.fn().mockResolvedValue([]),
      findSessionsByUserIdAndDateRange: vi.fn().mockResolvedValue([]),
    };
    useCase = new GetAnalyticsUseCase(repo);
  });

  it("returns analytics for all sessions when no preset", async () => {
    const sessions = [
      ReadingSession.reconstitute({
        id: "1",
        userId: "user-1",
        bookId: "book-1",
        startPage: 0,
        endPage: 10,
        pagesRead: 10,
        mood: "FOCUSED",
        readAt: new Date("2024-01-15T15:30:00Z"),
        createdAt: new Date("2024-01-15T10:00:00Z"),
      }),
      ReadingSession.reconstitute({
        id: "2",
        userId: "user-1",
        bookId: "book-1",
        startPage: 10,
        endPage: 30,
        pagesRead: 20,
        mood: "FOCUSED",
        readAt: new Date("2024-01-15T16:00:00Z"),
        createdAt: new Date("2024-01-15T10:00:00Z"),
      }),
    ];
    vi.mocked(repo.findSessionsByUserId).mockResolvedValue(sessions);

    const result = await useCase.execute("user-1", {}, "UTC");

    expect(result.totalPagesRead).toBe(30);
    expect(result.totalSessions).toBe(2);
    expect(result.averagePagesPerSession).toBe(15);
    expect(repo.findSessionsByUserId).toHaveBeenCalledWith("user-1");
  });

  it("uses preset week range", async () => {
    const sessions = [
      ReadingSession.reconstitute({
        id: "1",
        userId: "user-1",
        bookId: "book-1",
        startPage: 0,
        endPage: 10,
        pagesRead: 10,
        mood: "FOCUSED",
        readAt: new Date("2024-01-15T15:30:00Z"),
        createdAt: new Date("2024-01-15T10:00:00Z"),
      }),
    ];
    vi.mocked(repo.findSessionsByUserIdAndDateRange).mockResolvedValue(
      sessions,
    );

    const result = await useCase.execute("user-1", { preset: "week" }, "UTC");

    expect(result.totalPagesRead).toBe(10);
    expect(repo.findSessionsByUserIdAndDateRange).toHaveBeenCalled();
  });

  it("uses custom date range", async () => {
    const sessions = [
      ReadingSession.reconstitute({
        id: "1",
        userId: "user-1",
        bookId: "book-1",
        startPage: 0,
        endPage: 10,
        pagesRead: 10,
        mood: "FOCUSED",
        readAt: new Date("2024-01-15T15:30:00Z"),
        createdAt: new Date("2024-01-15T10:00:00Z"),
      }),
    ];
    vi.mocked(repo.findSessionsByUserIdAndDateRange).mockResolvedValue(
      sessions,
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");

    const result = await useCase.execute(
      "user-1",
      { startDate, endDate },
      "UTC",
    );

    expect(result.totalPagesRead).toBe(10);
    expect(repo.findSessionsByUserIdAndDateRange).toHaveBeenCalledWith(
      "user-1",
      startDate,
      endDate,
    );
  });

  it("validates input with Zod", async () => {
    await expect(
      useCase.execute(
        "user-1",
        { preset: "invalid" as "week" | "month" | "quarter" | "year" | "all" },
        "UTC",
      ),
    ).rejects.toThrow();
  });
});
