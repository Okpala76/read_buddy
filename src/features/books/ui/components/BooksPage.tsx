"use client";

import { useEffect, useState } from "react";
import { BookStatus } from "@/features/books/domain";
import { getBooks, getCurrentReading } from "@/features/books/ui/book-actions";
import type { BookView } from "@/features/books/ui/book-view";
import { BookList } from "./BookList";
import { CreateBookForm } from "./CreateBookForm";
import { Loader2 } from "lucide-react";

export function BooksPage() {
  const [books, setBooks] = useState<BookView[]>([]);
  const [currentReading, setCurrentReading] = useState<BookView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [booksData, readingData] = await Promise.all([
        getBooks(),
        getCurrentReading(),
      ]);
      setBooks(booksData);
      setCurrentReading(readingData);
    } catch (err) {
      setError("Failed to load books");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [booksData, readingData] = await Promise.all([
          getBooks(),
          getCurrentReading(),
        ]);
        if (mounted) {
          setBooks(booksData);
          setCurrentReading(readingData);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load books");
          console.error(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleBookChange = () => {
    fetchData();
  };

  const queuedBooks = books.filter((b) => b.status === BookStatus.QUEUED);
  const readingBooks = books.filter((b) => b.status === BookStatus.READING);
  const completedBooks = books.filter((b) => b.status === BookStatus.COMPLETED);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2
          className="text-primary size-8 animate-spin"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

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
        <CreateBookForm onSuccess={handleBookChange} />
      </div>

      {currentReading && (
        <BookList
          books={readingBooks}
          currentReadingId={currentReading.id}
          title="Currently Reading"
          emptyMessage="No book currently being read"
          onBookChange={handleBookChange}
        />
      )}

      <BookList
        books={queuedBooks}
        currentReadingId={currentReading?.id}
        title="Queued"
        emptyMessage="No queued books. Add a book to get started!"
        onBookChange={handleBookChange}
      />

      <BookList
        books={completedBooks}
        title="Completed"
        emptyMessage="No completed books yet"
        onBookChange={handleBookChange}
      />
    </div>
  );
}
