import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  books,
  bookDocuments,
  epubPositions,
  readingSessions,
} from "@/db/schema";
function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}
export async function completeEpubSession(
  userId: string,
  input: { bookId: string; locationIndex: number; finished: boolean },
) {
  return database().transaction(async (tx) => {
    const [book] = await tx
      .select()
      .from(books)
      .where(
        and(
          eq(books.id, input.bookId),
          eq(books.userId, userId),
          isNull(books.removedAt),
        ),
      )
      .for("update");
    if (!book) throw new Error("Book not found");
    const [document] = await tx
      .select({ id: bookDocuments.id })
      .from(bookDocuments)
      .where(
        and(
          eq(bookDocuments.bookId, book.id),
          eq(bookDocuments.userId, userId),
          eq(bookDocuments.format, "EPUB"),
        ),
      );
    if (!document) throw new Error("EPUB not found");
    const [position] = await tx
      .select()
      .from(epubPositions)
      .where(
        and(
          eq(epubPositions.bookId, book.id),
          eq(epubPositions.userId, userId),
        ),
      )
      .for("update");
    if (!position?.locationTotal || !position.locationIndex)
      throw new Error("Open the EPUB before recording reading.");
    const end = input.locationIndex;
    if (end > position.locationIndex || end > position.locationTotal)
      throw new Error("Choose a location you have reached.");
    if (input.finished && end !== position.locationTotal)
      throw new Error("Reach the end before completing the book.");
    if (end === position.locationTotal && !input.finished)
      throw new Error(
        "Confirm you finished the book or choose an earlier completed location.",
      );
    if (
      end <= position.confirmedLocation &&
      input.finished &&
      end === position.locationTotal &&
      book.status === "READING"
    ) {
      await tx
        .update(books)
        .set({
          status: "COMPLETED",
          completedAt: new Date(),
          completedViaDocument: true,
          updatedAt: new Date(),
        })
        .where(eq(books.id, book.id));
      return {
        locationsRead: 0,
        bookTitle: book.title,
        sessionId: null,
        readAt: new Date(),
        wasCompleted: true,
      };
    }
    if (end <= position.confirmedLocation)
      return {
        locationsRead: 0,
        bookTitle: book.title,
        sessionId: null,
        readAt: new Date(),
        wasCompleted: book.status === "COMPLETED",
      };
    if (book.status !== "READING")
      throw new Error("Start this book before logging reading.");
    const locationsRead = end - position.confirmedLocation,
      sessionId = crypto.randomUUID(),
      readAt = new Date();
    // Viewing the last location alone is not proof of finishing its content.
    const percent = input.finished
      ? 100
      : Math.min(99, Math.floor((end / position.locationTotal) * 100));
    await tx.insert(readingSessions).values({
      id: sessionId,
      userId,
      bookId: book.id,
      startPage: 0,
      endPage: 0,
      pagesRead: 0,
      locationsRead,
      source: "EPUB",
      readAt,
    });
    await tx
      .update(epubPositions)
      .set({
        confirmedLocation: end,
        confirmedPercent: Math.max(position.confirmedPercent, percent),
      })
      .where(eq(epubPositions.id, position.id));
    if (input.finished)
      await tx
        .update(books)
        .set({
          status: "COMPLETED",
          completedAt: readAt,
          completedViaDocument: true,
          updatedAt: readAt,
        })
        .where(eq(books.id, book.id));
    return {
      locationsRead,
      bookTitle: book.title,
      sessionId,
      readAt,
      wasCompleted: input.finished,
    };
  });
}
