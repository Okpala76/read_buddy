import { db } from "@/db/client";
import { books, readingSessions } from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import {
  ReadingSession,
  ReadingMood,
  type ReadingSessionProps,
  type LogReadingInput,
  type LogReadingResult,
  type ReadingSessionRepository,
} from "../domain";

function toDomain(row: typeof readingSessions.$inferSelect): ReadingSession {
  return ReadingSession.reconstitute({
    id: row.id,
    userId: row.userId,
    bookId: row.bookId,
    startPage: row.startPage,
    endPage: row.endPage,
    pagesRead: row.pagesRead,
    mood: row.mood as ReadingMood | null,
    readAt: row.readAt,
    createdAt: row.createdAt,
  });
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export class DrizzleReadingSessionRepository implements ReadingSessionRepository {
  async findById(id: string, userId: string): Promise<ReadingSession | null> {
    const database = getDb();
    const rows = await database
      .select()
      .from(readingSessions)
      .where(
        and(eq(readingSessions.id, id), eq(readingSessions.userId, userId)),
      )
      .limit(1);
    if (rows.length === 0) return null;
    return toDomain(rows[0]);
  }

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<ReadingSession[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.userId, userId))
      .orderBy(desc(readingSessions.readAt))
      .limit(limit)
      .offset(offset);
    return rows.map(toDomain);
  }

  async findByBookId(
    bookId: string,
    userId: string,
  ): Promise<ReadingSession[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.bookId, bookId),
          eq(readingSessions.userId, userId),
        ),
      )
      .orderBy(desc(readingSessions.readAt));
    return rows.map(toDomain);
  }

  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ReadingSession[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.userId, userId),
          gte(readingSessions.readAt, startDate),
          lte(readingSessions.readAt, endDate),
        ),
      )
      .orderBy(desc(readingSessions.readAt));
    return rows.map(toDomain);
  }

  async findRecentByUserId(
    userId: string,
    limit: number,
  ): Promise<ReadingSession[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.userId, userId))
      .orderBy(desc(readingSessions.readAt))
      .limit(limit);
    return rows.map(toDomain);
  }

  async save(session: ReadingSession): Promise<void> {
    const database = getDb();
    const props = session.toPersistence();
    await database
      .insert(readingSessions)
      .values({
        id: props.id,
        userId: props.userId,
        bookId: props.bookId,
        startPage: props.startPage,
        endPage: props.endPage,
        pagesRead: props.pagesRead,
        mood: props.mood,
        readAt: props.readAt,
        createdAt: props.createdAt,
      })
      .onConflictDoUpdate({
        target: readingSessions.id,
        set: {
          startPage: props.startPage,
          endPage: props.endPage,
          pagesRead: props.pagesRead,
          mood: props.mood,
          readAt: props.readAt,
        },
      });
  }

  async logReadingSession(
    userId: string,
    input: LogReadingInput,
  ): Promise<LogReadingResult> {
    const database = getDb();

    return await database.transaction(async (tx) => {
      const lockedBooks = await tx
        .select()
        .from(books)
        .where(and(eq(books.userId, userId), eq(books.status, "READING")))
        .limit(1)
        .for("update");

      if (lockedBooks.length === 0) {
        throw new Error("No book currently being read");
      }

      const currentBook = lockedBooks[0];

      if (currentBook.id !== input.bookId) {
        throw new Error("Book ID does not match current reading book");
      }

      const startPage = currentBook.currentPage;
      const effectiveEndPage = Math.min(
        startPage + input.submittedPages,
        currentBook.totalPages,
      );
      const pagesRead = effectiveEndPage - startPage;

      if (pagesRead <= 0) {
        throw new Error("No progress made; already at or past total pages");
      }

      const sessionId = crypto.randomUUID();
      const readAt = input.readAt ?? new Date();

      const sessionProps: ReadingSessionProps = {
        id: sessionId,
        userId,
        bookId: input.bookId,
        startPage,
        endPage: effectiveEndPage,
        pagesRead,
        mood: input.mood,
        readAt,
        createdAt: new Date(),
      };

      const session = ReadingSession.create(sessionProps);

      await tx.insert(readingSessions).values({
        id: sessionProps.id,
        userId: sessionProps.userId,
        bookId: sessionProps.bookId,
        startPage: sessionProps.startPage,
        endPage: sessionProps.endPage,
        pagesRead: sessionProps.pagesRead,
        mood: sessionProps.mood,
        readAt: sessionProps.readAt,
        createdAt: sessionProps.createdAt,
      });

      const newCurrentPage = effectiveEndPage;
      const wasCompleted = newCurrentPage >= currentBook.totalPages;

      const bookUpdate: Record<string, unknown> = {
        currentPage: newCurrentPage,
        updatedAt: new Date(),
      };

      if (wasCompleted) {
        bookUpdate.status = "COMPLETED";
        bookUpdate.completedAt = new Date();
      }

      await tx
        .update(books)
        .set(bookUpdate)
        .where(eq(books.id, currentBook.id));

      return {
        session,
        newCurrentPage,
        wasCompleted,
      };
    });
  }
}
