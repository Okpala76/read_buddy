import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ReadingSession,
  ReadingMood,
  type ReadingSessionRepository,
  type LogReadingInput,
  type LogReadingResult,
} from "../domain";
import {
  LogReadingUseCase,
  logReadingInputSchema,
  GetReadingSessionsUseCase,
  getSessionsInputSchema,
  GetRecentSessionsUseCase,
  GetDailyTargetUseCase,
  UpdateDailyTargetUseCase,
} from "./reading-use-cases";

const createMockRepo = (): ReadingSessionRepository => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findByBookId: vi.fn(),
  findByUserIdAndDateRange: vi.fn(),
  findRecentByUserId: vi.fn(),
  save: vi.fn(),
  logReadingSession: vi.fn(),
});

const testUserId = "550e8400-e29b-41d4-a716-446655440000";
const testBookId = "550e8400-e29b-41d4-a716-446655440001";
const testSessionId = "550e8400-e29b-41d4-a716-446655440002";

const baseSession = ReadingSession.create({
  id: testSessionId,
  userId: testUserId,
  bookId: testBookId,
  startPage: 0,
  endPage: 10,
  pagesRead: 10,
  mood: ReadingMood.FOCUSED,
  readAt: new Date("2024-01-15T10:00:00Z"),
  createdAt: new Date("2024-01-15T10:00:00Z"),
});

describe("LogReadingUseCase", () => {
  let repo: ReadingSessionRepository;
  let useCase: LogReadingUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new LogReadingUseCase(repo);
  });

  it("logs reading successfully", async () => {
    const mockResult: LogReadingResult = {
      session: baseSession,
      newCurrentPage: 10,
      wasCompleted: false,
    };
    vi.mocked(repo.logReadingSession).mockResolvedValue(mockResult);

    const input: LogReadingInput = {
      bookId: testBookId,
      submittedPages: 10,
      mood: ReadingMood.FOCUSED,
    };

    const result = await useCase.execute(testUserId, input);

    expect(result.session.id).toBe(testSessionId);
    expect(result.newCurrentPage).toBe(10);
    expect(result.wasCompleted).toBe(false);
    expect(repo.logReadingSession).toHaveBeenCalledWith(testUserId, input);
  });

  it("validates input with Zod - valid input", async () => {
    vi.mocked(repo.logReadingSession).mockResolvedValue({
      session: baseSession,
      newCurrentPage: 10,
      wasCompleted: false,
    });

    const result = await useCase.execute(testUserId, {
      bookId: testBookId,
      submittedPages: 10,
      mood: ReadingMood.FOCUSED,
    });

    expect(result).toBeDefined();
  });

  it("validates input with Zod - invalid bookId", async () => {
    await expect(
      useCase.execute(testUserId, {
        bookId: "not-a-uuid",
        submittedPages: 10,
        mood: null,
      }),
    ).rejects.toThrow();
  });

  it("validates input with Zod - submittedPages must be positive", async () => {
    await expect(
      useCase.execute(testUserId, {
        bookId: testBookId,
        submittedPages: 0,
        mood: null,
      }),
    ).rejects.toThrow();

    await expect(
      useCase.execute(testUserId, {
        bookId: testBookId,
        submittedPages: -1,
        mood: null,
      }),
    ).rejects.toThrow();
  });

  it("accepts optional mood", async () => {
    vi.mocked(repo.logReadingSession).mockResolvedValue({
      session: baseSession,
      newCurrentPage: 10,
      wasCompleted: false,
    });

    const result = await useCase.execute(testUserId, {
      bookId: testBookId,
      submittedPages: 10,
      mood: null,
    });

    expect(result).toBeDefined();
  });

  it("accepts null mood", async () => {
    vi.mocked(repo.logReadingSession).mockResolvedValue({
      session: baseSession,
      newCurrentPage: 10,
      wasCompleted: false,
    });

    const result = await useCase.execute(testUserId, {
      bookId: testBookId,
      submittedPages: 10,
      mood: null,
    });

    expect(result).toBeDefined();
  });
});

describe("GetReadingSessionsUseCase", () => {
  let repo: ReadingSessionRepository;
  let useCase: GetReadingSessionsUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new GetReadingSessionsUseCase(repo);
  });

  it("returns sessions for user", async () => {
    const sessions = [baseSession];
    vi.mocked(repo.findByUserId).mockResolvedValue(sessions);

    const result = await useCase.execute(testUserId);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(testSessionId);
  });

  it("passes limit and offset to repository", async () => {
    vi.mocked(repo.findByUserId).mockResolvedValue([]);

    await useCase.execute(testUserId, { limit: 10, offset: 20 });

    expect(repo.findByUserId).toHaveBeenCalledWith(testUserId, 10, 20);
  });

  it("filters by bookId when provided", async () => {
    vi.mocked(repo.findByBookId).mockResolvedValue([baseSession]);

    const result = await useCase.execute(testUserId, { bookId: testBookId });
    expect(result).toHaveLength(1);
    expect(repo.findByBookId).toHaveBeenCalledWith(testBookId, testUserId);
  });

  it("filters by date range when provided", async () => {
    vi.mocked(repo.findByUserIdAndDateRange).mockResolvedValue([baseSession]);

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");

    const result = await useCase.execute(testUserId, { startDate, endDate });
    expect(result).toHaveLength(1);
    expect(repo.findByUserIdAndDateRange).toHaveBeenCalledWith(
      testUserId,
      startDate,
      endDate,
    );
  });

  it("validates input with Zod", async () => {
    await expect(useCase.execute(testUserId, { limit: -1 })).rejects.toThrow();

    await expect(useCase.execute(testUserId, { limit: 101 })).rejects.toThrow();

    await expect(useCase.execute(testUserId, { offset: -1 })).rejects.toThrow();
  });
});

describe("GetRecentSessionsUseCase", () => {
  let repo: ReadingSessionRepository;
  let useCase: GetRecentSessionsUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new GetRecentSessionsUseCase(repo);
  });

  it("returns recent sessions with default limit", async () => {
    const sessions = [baseSession];
    vi.mocked(repo.findRecentByUserId).mockResolvedValue(sessions);

    const result = await useCase.execute(testUserId);
    expect(result).toHaveLength(1);
    expect(repo.findRecentByUserId).toHaveBeenCalledWith(testUserId, 10);
  });

  it("accepts custom limit", async () => {
    vi.mocked(repo.findRecentByUserId).mockResolvedValue([]);

    await useCase.execute(testUserId, 5);
    expect(repo.findRecentByUserId).toHaveBeenCalledWith(testUserId, 5);
  });
});

describe("GetDailyTargetUseCase", () => {
  let useCase: GetDailyTargetUseCase;

  beforeEach(() => {
    useCase = new GetDailyTargetUseCase();
  });

  it("returns default target of 10", async () => {
    const target = await useCase.execute(testUserId);
    expect(target).toBe(10);
  });
});

describe("UpdateDailyTargetUseCase", () => {
  let useCase: UpdateDailyTargetUseCase;

  beforeEach(() => {
    useCase = new UpdateDailyTargetUseCase();
  });

  it("throws when target is not positive", async () => {
    await expect(useCase.execute(testUserId, 0)).rejects.toThrow(
      "Daily target must be positive",
    );
    await expect(useCase.execute(testUserId, -1)).rejects.toThrow(
      "Daily target must be positive",
    );
  });

  it("accepts positive target", async () => {
    // Should not throw
    await expect(useCase.execute(testUserId, 20)).resolves.toBeUndefined();
  });
});

describe("logReadingInputSchema", () => {
  it("validates valid input", () => {
    const result = logReadingInputSchema.safeParse({
      bookId: testBookId,
      submittedPages: 10,
      mood: ReadingMood.FOCUSED,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid bookId", () => {
    const result = logReadingInputSchema.safeParse({
      bookId: "not-a-uuid",
      submittedPages: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive submittedPages", () => {
    const result = logReadingInputSchema.safeParse({
      bookId: testBookId,
      submittedPages: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid moods", () => {
    const moods = [
      ReadingMood.FOCUSED,
      ReadingMood.RELAXED,
      ReadingMood.ENERGIZED,
      ReadingMood.DISTRACTED,
      ReadingMood.TIRED,
    ];

    for (const mood of moods) {
      const result = logReadingInputSchema.safeParse({
        bookId: testBookId,
        submittedPages: 10,
        mood,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts null mood", () => {
    const result = logReadingInputSchema.safeParse({
      bookId: testBookId,
      submittedPages: 10,
      mood: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts omitted mood", () => {
    const result = logReadingInputSchema.safeParse({
      bookId: testBookId,
      submittedPages: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe("getSessionsInputSchema", () => {
  it("validates valid input", () => {
    const result = getSessionsInputSchema.safeParse({
      limit: 10,
      offset: 0,
      bookId: testBookId,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid limit", () => {
    expect(getSessionsInputSchema.safeParse({ limit: -1 }).success).toBe(false);
    expect(getSessionsInputSchema.safeParse({ limit: 101 }).success).toBe(
      false,
    );
  });

  it("rejects negative offset", () => {
    expect(getSessionsInputSchema.safeParse({ offset: -1 }).success).toBe(
      false,
    );
  });

  it("accepts optional fields", () => {
    const result = getSessionsInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
