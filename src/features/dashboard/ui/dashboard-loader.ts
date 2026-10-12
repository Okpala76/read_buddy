import "server-only";

import { getUserDayUtcRange } from "@/features/analytics/domain";
import { GetStreakUseCase } from "@/features/analytics/application";
import { DrizzleAnalyticsRepository } from "@/features/analytics/infrastructure";
import { GetBooksUseCase } from "@/features/books/application";
import { BookStatus } from "@/features/books/domain";
import { DrizzleBookRepository } from "@/features/books/infrastructure";
import { toBookView } from "@/features/books/ui/book-view";
import {
  GetReadingSessionsUseCase,
  GetRecentSessionsUseCase,
} from "@/features/reading/application";
import { DrizzleReadingSessionRepository } from "@/features/reading/infrastructure";
import { toReadingSessionView } from "@/features/reading/ui/reading-session-view";
import { DrizzleReminderPreferenceRepository } from "@/features/reminders/infrastructure";
import { requireAuth } from "@/lib/auth/server";

export async function loadDashboardData() {
  const user = await requireAuth();
  const bookRepository = new DrizzleBookRepository();
  const sessionRepository = new DrizzleReadingSessionRepository();
  const analyticsRepository = new DrizzleAnalyticsRepository();
  const preferenceRepository = new DrizzleReminderPreferenceRepository();
  const now = new Date();
  const todayRange = getUserDayUtcRange(now, user.timezone);

  const [books, recentSessions, todaySessions, reminderPreference, streak] =
    await Promise.all([
      new GetBooksUseCase(bookRepository).execute(user.id, {}),
      new GetRecentSessionsUseCase(sessionRepository).execute(user.id, 5),
      new GetReadingSessionsUseCase(sessionRepository).execute(user.id, {
        startDate: todayRange.startDate,
        endDate: todayRange.endDate,
      }),
      preferenceRepository.findByUserId(user.id),
      new GetStreakUseCase(analyticsRepository).execute(user.id, user.timezone),
    ]);

  const bookViews = books.map(toBookView);
  const queuedBooks = bookViews.filter(
    (book) => book.status === BookStatus.QUEUED,
  );

  return {
    currentBook:
      bookViews.find((book) => book.status === BookStatus.READING) ?? null,
    queuedBooks: queuedBooks.slice(0, 3),
    queuedBookCount: queuedBooks.length,
    dailyTarget: user.dailyPageTarget,
    pagesReadToday: todaySessions.reduce(
      (total, session) => total + session.pagesRead,
      0,
    ),
    currentStreak: streak.currentStreak,
    recentSessions: recentSessions.map(toReadingSessionView),
    timezone: user.timezone,
    reminderSettings: {
      enabled: reminderPreference?.enabled ?? false,
      emailEnabled: reminderPreference?.emailEnabled ?? true,
    },
  };
}
