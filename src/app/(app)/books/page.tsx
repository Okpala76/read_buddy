import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { bookDocuments, epubPositions } from "@/db/schema";
import { GetBooksUseCase } from "@/features/books/application";
import { DrizzleBookRepository } from "@/features/books/infrastructure";
import { BooksPage as BooksPageComponent } from "@/features/books/ui/components/BooksPage";
import { toBookView } from "@/features/books/ui/book-view";
import { requireAuth } from "@/lib/auth/server";

export default async function BooksPage() {
  const user = await requireAuth();
  const books = await new GetBooksUseCase(new DrizzleBookRepository()).execute(
    user.id,
    {},
  );

  const views = books.map(toBookView);
  if (!db || views.length === 0) return <BooksPageComponent books={views} />;
  const rows = await db
    .select({
      bookId: bookDocuments.bookId,
      locationIndex: epubPositions.locationIndex,
      locationTotal: epubPositions.locationTotal,
      progressPercent: epubPositions.progressPercent,
    })
    .from(bookDocuments)
    .leftJoin(
      epubPositions,
      and(
        eq(epubPositions.bookId, bookDocuments.bookId),
        eq(epubPositions.userId, user.id),
      ),
    )
    .where(
      and(
        eq(bookDocuments.userId, user.id),
        eq(bookDocuments.format, "EPUB"),
        inArray(
          bookDocuments.bookId,
          views.map((book) => book.id),
        ),
      ),
    );
  const progressById = new Map(
    rows.map((row) => [
      row.bookId,
      {
        locationIndex: row.locationIndex,
        locationTotal: row.locationTotal,
        progressPercent: row.progressPercent,
      },
    ]),
  );
  return (
    <BooksPageComponent
      books={views.map((book) => ({
        ...book,
        epubProgress: progressById.get(book.id),
      }))}
    />
  );
}
