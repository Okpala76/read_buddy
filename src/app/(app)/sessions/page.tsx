import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bookDocuments } from "@/db/schema";
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

  const view = currentBook ? toBookView(currentBook) : null;
  if (view && db) {
    const [epub] = await db
      .select({ id: bookDocuments.id })
      .from(bookDocuments)
      .where(
        and(
          eq(bookDocuments.bookId, view.id),
          eq(bookDocuments.userId, user.id),
          eq(bookDocuments.format, "EPUB"),
        ),
      )
      .limit(1);
    if (epub)
      view.epubProgress = {
        locationIndex: null,
        locationTotal: null,
        progressPercent: null,
      };
  }
  return (
    <ReadingPage
      currentBook={view}
      dailyTarget={user.dailyPageTarget}
      recentSessions={recentSessions.map(toReadingSessionView)}
      timezone={user.timezone}
    />
  );
}
