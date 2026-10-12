import type { BookView } from "@/features/books/ui/book-view";
import { BookCard } from "./BookCard";
import { BookOpen } from "lucide-react";

interface BookListProps {
  books: BookView[];
  currentReadingId?: string;
  hasCurrentReading?: boolean;
  title: string;
  description?: string;
  emptyMessage: string;
}

export function BookList({
  books,
  currentReadingId,
  hasCurrentReading = false,
  title,
  description,
  emptyMessage,
}: BookListProps) {
  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-foreground text-xl font-semibold">{title}</h2>
          <span className="text-muted-foreground text-sm">{books.length}</span>
        </div>
        {description && (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {description}
          </p>
        )}
      </div>

      {books.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border p-7 text-center">
          <BookOpen
            className="text-muted-foreground mx-auto mb-3 size-9"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              isCurrentReading={book.id === currentReadingId}
              hasCurrentReading={hasCurrentReading}
            />
          ))}
        </div>
      )}
    </section>
  );
}
