"use client";

import { useId, useState, useTransition } from "react";
import { BookOpen, Play, CheckCircle, Trash2, RotateCcw } from "lucide-react";
import { BookStatus } from "@/features/books/domain";
import type { BookView } from "@/features/books/ui/book-view";
import {
  startBook,
  updateBookProgress,
  completeBook,
  deleteBook,
  reopenCompletedBook,
} from "@/features/books/ui/book-actions";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface BookCardProps {
  book: BookView;
  isCurrentReading?: boolean;
}

export function BookCard({ book, isCurrentReading }: BookCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [undoResumePage, setUndoResumePage] = useState("");
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoOpen, setUndoOpen] = useState(false);
  const undoPageId = useId();

  const handleAction = (action: () => Promise<unknown>) => {
    startTransition(async () => {
      try {
        setError(null);
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  };

  const handleUndoComplete = () => {
    startTransition(async () => {
      try {
        setUndoError(null);
        const page = Number(undoResumePage);
        if (
          undoResumePage.trim() === "" ||
          !Number.isInteger(page) ||
          page < 0 ||
          page >= book.totalPages
        ) {
          setUndoError(`Enter a page between 0 and ${book.totalPages - 1}`);
          return;
        }
        await reopenCompletedBook({ bookId: book.id, resumePage: page });
        setUndoResumePage("");
        setUndoOpen(false);
      } catch (err) {
        setUndoError(
          err instanceof Error ? err.message : "Failed to undo completion",
        );
      }
    });
  };

  const willCompleteWithIncrement =
    book.status === BookStatus.READING &&
    book.currentPage + 1 >= book.totalPages;
  const remainingPages = book.totalPages - book.currentPage;

  const statusColors = {
    QUEUED: "bg-muted text-muted-foreground",
    READING: "bg-primary/10 text-primary border-primary/20",
    COMPLETED: "bg-chart-3/15 text-foreground border-chart-3/30",
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-lg",
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

          {error && (
            <div className="text-destructive mt-2 text-sm" role="alert">
              {error}
            </div>
          )}
        </div>

        {book.status !== BookStatus.COMPLETED && (
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            {book.status === BookStatus.QUEUED && (
              <button
                onClick={() =>
                  handleAction(() => startBook({ bookId: book.id }))
                }
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="size-3.5" aria-hidden="true" />
                Start
              </button>
            )}

            {book.status === BookStatus.READING && (
              <div className="flex items-center gap-1">
                {willCompleteWithIncrement ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        disabled={isPending}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Finish book"
                      >
                        <span className="text-lg">+1</span>
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Finish book?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark {book.title} as finished at page{" "}
                          {book.totalPages}. This page change will not be
                          recorded as a reading session.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            handleAction(() =>
                              updateBookProgress({
                                bookId: book.id,
                                page: book.currentPage + 1,
                              }),
                            )
                          }
                        >
                          Yes, mark finished
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <button
                    type="button"
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
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      disabled={isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle className="size-3.5" aria-hidden="true" />
                      Finish book&hellip;
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Finish book?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark {book.title} as finished, jumping from
                        page {book.currentPage} to page {book.totalPages}. The
                        skipped {remainingPages} pages will not be recorded as a
                        reading session. Use Log reading to record pages and
                        finish the book in one step.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          handleAction(() => completeBook({ bookId: book.id }))
                        }
                      >
                        Yes, mark finished
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

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
          </div>
        )}

        {book.status === BookStatus.COMPLETED && (
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <AlertDialog
              open={undoOpen}
              onOpenChange={(open) => {
                setUndoOpen(open);
                if (open) setUndoError(null);
              }}
            >
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={isPending}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-ring inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Undo completion
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Undo completion?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter the page you were actually on. The book will resume
                    with Reading status if no other book is current; otherwise,
                    it will return to your queue.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label htmlFor={undoPageId}>Resume page</Label>
                  <Input
                    id={undoPageId}
                    type="number"
                    min={0}
                    max={book.totalPages - 1}
                    value={undoResumePage}
                    onChange={(event) => setUndoResumePage(event.target.value)}
                    placeholder={`Page (0-${book.totalPages - 1})`}
                    aria-invalid={Boolean(undoError)}
                    aria-describedby={
                      undoError ? `${undoPageId}-error` : undefined
                    }
                    autoFocus
                  />
                  {undoError && (
                    <p
                      id={`${undoPageId}-error`}
                      className="text-destructive text-sm"
                      role="alert"
                    >
                      {undoError}
                    </p>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    onClick={handleUndoComplete}
                    disabled={isPending}
                  >
                    Undo
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </article>
  );
}
