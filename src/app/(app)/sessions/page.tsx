import { GetCurrentReadingUseCase } from "@/features/books/application";
import { DrizzleBookRepository } from "@/features/books/infrastructure";
import { toBookView } from "@/features/books/ui/book-view";
import { GetRecentSessionsUseCase } from "@/features/reading/application";
import { DrizzleReadingSessionRepository } from "@/features/reading/infrastructure";
import { ReadingPage } from "@/features/reading/ui/components/ReadingPage";
import { toReadingSessionView } from "@/features/reading/ui/reading-session-view";
import { requireAuth } from "@/lib/auth/server";

export default async function SessionsPage() {
  const user = await requireAuth();
  const [currentBook, recentSessions] = await Promise.all([
    new GetCurrentReadingUseCase(new DrizzleBookRepository()).execute(user.id),
    new GetRecentSessionsUseCase(new DrizzleReadingSessionRepository()).execute(
      user.id,
      10,
    ),
  ]);

  return (
    <ReadingPage
      currentBook={currentBook ? toBookView(currentBook) : null}
      dailyTarget={user.dailyPageTarget}
      recentSessions={recentSessions.map(toReadingSessionView)}
      timezone={user.timezone}
    />
  );
}
