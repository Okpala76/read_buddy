import { calculateStreak, getUserReadingDates } from "../domain";

import type {
  ReminderStreakRepository,
  ReminderStreakService,
  ReadingStreakResult,
} from "../domain";

export class ReadingStreakService implements ReminderStreakService {
  constructor(
    private readonly streakRepository: ReminderStreakRepository,
    private readonly getUserTimezone: (userId: string) => Promise<string>,
  ) {}

  async getStreak(userId: string, now: Date): Promise<ReadingStreakResult> {
    const sessions = await this.streakRepository.findRecentReadingDates(
      userId,
      1000,
    );
    const timezone = await this.getUserTimezone(userId);
    const readingDates = getUserReadingDates(sessions, timezone);
    return calculateStreak(readingDates, now, timezone);
  }
}
