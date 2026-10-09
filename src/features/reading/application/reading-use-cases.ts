import { z } from "zod";
import {
  ReadingSession,
  type LogReadingResult,
  type ReadingSessionRepository,
} from "../domain";
import { Book } from "@/features/books/domain";

export const logReadingInputSchema = z.object({
  bookId: z.string().uuid(),
  submittedPages: z.number().int().positive(),
  mood: z
    .enum(["FOCUSED", "RELAXED", "ENERGIZED", "DISTRACTED", "TIRED"])
    .nullable()
    .optional(),
  readAt: z.date().optional(),
});

export type LogReadingInput = z.infer<typeof logReadingInputSchema>;

export const getSessionsInputSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  bookId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export type GetSessionsInput = z.infer<typeof getSessionsInputSchema>;

export const getBooksInputSchema = z.object({
  status: z.enum(["QUEUED", "READING", "COMPLETED"]).optional(),
});

export type GetBooksInput = z.infer<typeof getBooksInputSchema>;

export class LogReadingUseCase {
  constructor(private readonly sessionRepository: ReadingSessionRepository) {}

  async execute(
    userId: string,
    input: LogReadingInput,
  ): Promise<LogReadingResult> {
    const parsed = logReadingInputSchema.parse(input);
    // Create a new object with the properly typed mood
    const domainInput: {
      bookId: string;
      submittedPages: number;
      mood: "FOCUSED" | "RELAXED" | "ENERGIZED" | "DISTRACTED" | "TIRED" | null;
      readAt?: Date;
    } = {
      bookId: parsed.bookId,
      submittedPages: parsed.submittedPages,
      mood: parsed.mood ?? null,
      readAt: parsed.readAt,
    };
    return this.sessionRepository.logReadingSession(userId, domainInput);
  }
}

export class GetReadingSessionsUseCase {
  constructor(private readonly sessionRepository: ReadingSessionRepository) {}

  async execute(
    userId: string,
    input: GetSessionsInput = {},
  ): Promise<ReadingSession[]> {
    const parsed = getSessionsInputSchema.parse(input);
    const { limit = 50, offset = 0, bookId, startDate, endDate } = parsed;

    if (bookId) {
      return this.sessionRepository.findByBookId(bookId, userId);
    }

    if (startDate && endDate) {
      return this.sessionRepository.findByUserIdAndDateRange(
        userId,
        startDate,
        endDate,
      );
    }

    return this.sessionRepository.findByUserId(userId, limit, offset);
  }
}

export class GetRecentSessionsUseCase {
  constructor(private readonly sessionRepository: ReadingSessionRepository) {}

  async execute(userId: string, limit = 10): Promise<ReadingSession[]> {
    return this.sessionRepository.findRecentByUserId(userId, limit);
  }
}

export interface DailyTargetRepository {
  findByUserId(userId: string): Promise<number>;
  updateByUserId(userId: string, target: number): Promise<void>;
}

export class GetDailyTargetUseCase {
  constructor(private readonly repository: DailyTargetRepository) {}

  async execute(userId: string): Promise<number> {
    return this.repository.findByUserId(userId);
  }
}

export class UpdateDailyTargetUseCase {
  constructor(private readonly repository: DailyTargetRepository) {}

  async execute(userId: string, target: number): Promise<void> {
    if (!Number.isInteger(target) || target <= 0) {
      throw new Error("Daily target must be positive");
    }

    await this.repository.updateByUserId(userId, target);
  }
}

export class GetBooksUseCase {
  constructor(
    private readonly bookRepository: {
      findByUserId(userId: string): Promise<Book[]>;
    },
  ) {}

  async execute(userId: string, input: GetBooksInput = {}): Promise<Book[]> {
    const parsed = getBooksInputSchema.parse(input);
    const { status } = parsed;

    const books = await this.bookRepository.findByUserId(userId);

    if (status) {
      return books.filter((b) => b.status === status);
    }
    return books;
  }
}
