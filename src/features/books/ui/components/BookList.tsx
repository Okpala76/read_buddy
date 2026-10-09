import type { BookView } from "@/features/books/ui/book-view";
import { BookCard } from "./BookCard";
import { BookOpen } from "lucide-react";

interface BookListProps {
  books: BookView[];
  currentReadingId?: string;
  title: string;
  emptyMessage: string;
}

export function BookList({
  books,
  currentReadingId,
  title,
  emptyMessage,
}: BookListProps) {
  if (books.length === 0) {
    return (
      <div className="py-12 text-center">
        <BookOpen
          className="text-muted-foreground mx-auto mb-3 size-12"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      <div className="space-y-3">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            isCurrentReading={book.id === currentReadingId}
          />
        ))}
      </div>
    </section>
  );
}
