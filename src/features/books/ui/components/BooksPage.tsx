import { BookStatus } from "@/features/books/domain";
import type { BookView } from "@/features/books/ui/book-view";
import { BookList } from "./BookList";
import { CreateBookForm } from "./CreateBookForm";

export function BooksPage({ books }: { books: BookView[] }) {
  const queuedBooks = books.filter((b) => b.status === BookStatus.QUEUED);
  const readingBooks = books.filter((b) => b.status === BookStatus.READING);
  const completedBooks = books.filter((b) => b.status === BookStatus.COMPLETED);
  const currentReading = readingBooks[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">
            Books
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your queue and choose what to read next.
          </p>
        </div>
        <CreateBookForm />
      </div>

      {currentReading && (
        <BookList
          books={readingBooks}
          currentReadingId={currentReading.id}
          title="Currently Reading"
          emptyMessage="No book currently being read"
        />
      )}

      <BookList
        books={queuedBooks}
        currentReadingId={currentReading?.id}
        title="Queued"
        emptyMessage="No queued books. Add a book to get started!"
      />

      <BookList
        books={completedBooks}
        title="Completed"
        emptyMessage="No completed books yet"
      />
    </div>
  );
}
