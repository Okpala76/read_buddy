import { BookStatus } from "@/features/books/domain";
import type { BookView } from "@/features/books/ui/book-view";
import { BookList } from "./BookList";
import { CreateBookForm } from "./CreateBookForm";

export function BooksPage({ books }: { books: BookView[] }) {
  const queuedBooks = books.filter((book) => book.status === BookStatus.QUEUED);
  const readingBooks = books.filter(
    (book) => book.status === BookStatus.READING,
  );
  const completedBooks = books.filter(
    (book) => book.status === BookStatus.COMPLETED,
  );
  const currentReading = readingBooks[0] ?? null;

  return (
    <div className="space-y-10">
      <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-medium">Library</p>
          <h1 className="text-foreground mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Keep your next read ready.
          </h1>
          <p className="text-muted-foreground mt-2">
            One book stays active. Everything else waits here until you&apos;re
            ready for it.
          </p>
        </div>
        <CreateBookForm />
      </header>

      {currentReading ? (
        <BookList
          books={readingBooks}
          currentReadingId={currentReading.id}
          hasCurrentReading
          title="Reading now"
          description="Progress belongs to your reading log; this section keeps the active book easy to find."
          emptyMessage="No active book"
        />
      ) : (
        <section className="border-border bg-primary/5 rounded-2xl border p-5 sm:p-6">
          <p className="text-foreground font-semibold">
            Nothing is active right now.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Start one of the books in Up next when you&apos;re ready to begin.
          </p>
        </section>
      )}

      <BookList
        books={queuedBooks}
        currentReadingId={currentReading?.id}
        hasCurrentReading={Boolean(currentReading)}
        title="Up next"
        description={
          currentReading
            ? "These books are waiting. Move your current book back to the queue before starting another."
            : "Choose one book to make it your active read."
        }
        emptyMessage="Your queue is empty. Add a book when you know what you want to read next."
      />

      <section className="border-border border-t pt-8">
        <BookList
          books={completedBooks}
          title="Finished"
          description="A quieter record of books you have completed."
          emptyMessage="Finished books will appear here."
        />
      </section>
    </div>
  );
}
