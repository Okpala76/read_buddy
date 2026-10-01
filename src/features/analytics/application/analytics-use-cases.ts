import { z } from "zod";
import {
  type AnalyticsData,
  computeAnalytics,
  getDateRangePreset,
  type StreakResult,
} from "@/features/analytics/domain";
import { type ReadingSession } from "@/features/reading/domain";

export const getAnalyticsInputSchema = z.object({
  preset: z.enum(["week", "month", "quarter", "year", "all"]).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export type GetAnalyticsInput = z.infer<typeof getAnalyticsInputSchema>;

export const getStreakInputSchema = z.object({});

export type GetStreakInput = z.infer<typeof getStreakInputSchema>;

export interface AnalyticsRepository {
  findSessionsByUserId(userId: string): Promise<ReadingSession[]>;
  findSessionsByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ReadingSession[]>;
}

export class GetAnalyticsUseCase {
  constructor(private readonly sessionRepository: AnalyticsRepository) {}

  async execute(
    userId: string,
    input: GetAnalyticsInput,
    timezone: string,
  ): Promise<AnalyticsData> {
    const parsed = this.getAnalyticsInputSchema.parse(input);

    let sessions;
    if (parsed.preset && !parsed.startDate && !parsed.endDate) {
      const { startDate, endDate } = getDateRangePreset(
        parsed.preset,
        timezone,
      );
      sessions = await this.sessionRepository.findSessionsByUserIdAndDateRange(
        userId,
        startDate,
        endDate,
      );
    } else if (parsed.startDate && parsed.endDate) {
      sessions = await this.sessionRepository.findSessionsByUserIdAndDateRange(
        userId,
        parsed.startDate,
        parsed.endDate,
      );
    } else {
      sessions = await this.sessionRepository.findSessionsByUserId(userId);
    }

    return computeAnalytics(sessions, timezone);
  }

  private getAnalyticsInputSchema = z.object({
    preset: z.enum(["week", "month", "quarter", "year", "all"]).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  });
}

export class GetStreakUseCase {
  constructor(private readonly sessionRepository: AnalyticsRepository) {}

  async execute(userId: string, timezone: string): Promise<StreakResult> {
    const sessions = await this.sessionRepository.findSessionsByUserId(userId);
    const { streak } = computeAnalytics(sessions, timezone);
    return streak;
  }
}

export class GetDateRangeAnalyticsUseCase {
  constructor(private readonly sessionRepository: AnalyticsRepository) {}

  async execute(
    userId: string,
    startDate: Date,
    endDate: Date,
    timezone: string,
  ): Promise<AnalyticsData> {
    const sessions =
      await this.sessionRepository.findSessionsByUserIdAndDateRange(
        userId,
        startDate,
        endDate,
      );
    return computeAnalytics(sessions, timezone);
  }
}
