"use client";

import { BookOpen, Play, CheckCircle, RotateCcw, Trash2 } from "lucide-react";
import { Book, BookStatus } from "@/features/books/domain";
import {
  startBook,
  updateBookProgress,
  completeBook,
  requeueBook,
  deleteBook,
} from "@/features/books/ui/book-actions";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

interface BookCardProps {
  book: Book;
  isCurrentReading?: boolean;
}

export function BookCard({ book, isCurrentReading }: BookCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (
    action: () => Promise<unknown>,
    onSuccess?: () => void,
  ) => {
    startTransition(async () => {
      try {
        await action();
        onSuccess?.();
      } catch (error) {
        console.error("Action failed:", error);
      }
    });
  };

  const statusColors = {
    QUEUED: "bg-muted text-muted-foreground",
    READING: "bg-primary/10 text-primary border-primary/20",
    COMPLETED: "bg-green/10 text-green border-green/20",
  };

  const statusIcons = {
    QUEUED: BookOpen,
    READING: Play,
    COMPLETED: CheckCircle,
  };

  const StatusIcon = statusIcons[book.status];

  return (
    <article
      className={cn(
        "relative rounded-xl border p-4 transition-all hover:shadow-md",
        isCurrentReading &&
          "ring-primary/50 border-primary/30 bg-primary/5 ring-2",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-16 w-12 flex-shrink-0 items-center justify-center rounded-lg",
            statusColors[book.status],
          )}
        >
          <StatusIcon className="size-6" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-foreground truncate font-medium">{book.title}</h3>
          <p className="text-muted-foreground truncate text-sm">
            {book.author}
          </p>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {book.currentPage} / {book.totalPages} pages
            </span>
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${book.progressPercent}%` }}
              />
            </div>
            <span className="text-muted-foreground w-10 text-right">
              {book.progressPercent}%
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                statusColors[book.status],
              )}
            >
              <StatusIcon className="size-3" aria-hidden="true" />
              {book.status}
            </span>
            {book.completedAt && (
              <span className="text-muted-foreground text-xs">
                Completed {book.completedAt.toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {book.status === BookStatus.QUEUED && (
            <button
              onClick={() => handleAction(() => startBook({ bookId: book.id }))}
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="size-3.5" aria-hidden="true" />
              Start
            </button>
          )}

          {book.status === BookStatus.READING && (
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  handleAction(() =>
                    updateBookProgress({
                      bookId: book.id,
                      page: book.currentPage + 1,
                    }),
                  )
                }
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                aria-label="Increment page"
              >
                <span className="text-lg">+1</span>
              </button>
              <button
                onClick={() =>
                  handleAction(() => completeBook({ bookId: book.id }))
                }
                disabled={isPending}
                className="bg-green text-green-foreground hover:bg-green/90 focus-visible:ring-ring inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle className="size-3.5" aria-hidden="true" />
                Complete
              </button>
            </div>
          )}

          {book.status === BookStatus.COMPLETED && (
            <button
              onClick={() =>
                handleAction(() => requeueBook({ bookId: book.id }))
              }
              disabled={isPending}
              className="border-border bg-background hover:bg-muted focus-visible:ring-ring inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Requeue
            </button>
          )}

          {book.status !== BookStatus.COMPLETED && (
            <button
              onClick={() =>
                handleAction(() => deleteBook({ bookId: book.id }))
              }
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Delete book"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
