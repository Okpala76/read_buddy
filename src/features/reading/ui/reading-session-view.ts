import type {
  ReadingSession,
  ReadingSessionProps,
} from "@/features/reading/domain";

export type ReadingSessionView = Omit<ReadingSessionProps, "userId">;

export function toReadingSessionView(
  session: ReadingSession,
): ReadingSessionView {
  const persisted = session.toPersistence();

  return {
    id: persisted.id,
    bookId: persisted.bookId,
    startPage: persisted.startPage,
    endPage: persisted.endPage,
    pagesRead: persisted.pagesRead,
    mood: persisted.mood,
    readAt: persisted.readAt,
    createdAt: persisted.createdAt,
  };
}
