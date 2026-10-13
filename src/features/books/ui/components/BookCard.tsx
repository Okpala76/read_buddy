"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  Play,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";

import {
  deleteBook,
  reopenCompletedBook,
  requeueBook,
  startBook,
} from "@/features/books/ui/book-actions";
import { BookStatus } from "@/features/books/domain";
import type { BookView } from "@/features/books/ui/book-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

interface BookCardProps {
  book: BookView;
  isCurrentReading?: boolean;
  hasCurrentReading?: boolean;
}

export function BookCard({
  book,
  isCurrentReading = false,
  hasCurrentReading = false,
}: BookCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [undoResumePage, setUndoResumePage] = useState("");
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoOpen, setUndoOpen] = useState(false);
  const undoPageId = useId();

  const remainingPages = Math.max(0, book.totalPages - book.currentPage);
  const canStartQueuedBook =
    book.status === BookStatus.QUEUED && !hasCurrentReading;

  function handleAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        setError(null);
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  function handleUndoComplete() {
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

        await reopenCompletedBook({
          bookId: book.id,
          resumePage: page,
        });
        setUndoResumePage("");
        setUndoOpen(false);
      } catch (err) {
        setUndoError(
          err instanceof Error ? err.message : "Failed to reopen book",
        );
      }
    });
  }

  const statusLabel =
    book.status === BookStatus.READING
      ? "Reading now"
      : book.status === BookStatus.QUEUED
        ? "Up next"
        : "Finished";

  return (
    <article
      className={cn(
        "border-border bg-card rounded-2xl border p-4 sm:p-5",
        isCurrentReading && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-xl",
            isCurrentReading
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {book.status === BookStatus.COMPLETED ? (
            <CheckCircle2 className="size-5" aria-hidden="true" />
          ) : (
            <BookOpen className="size-5" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-foreground min-w-0 truncate font-semibold">
              {book.title}
            </h3>
            <span className="text-muted-foreground text-xs font-medium">
              {statusLabel}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-sm">
            {book.author}
          </p>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground">
                {book.currentPage} of {book.totalPages} pages
              </span>
              <span className="text-muted-foreground">
                {book.progressPercent}% complete
              </span>
            </div>
            <div
              className="bg-muted h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-label={`${book.title} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={book.progressPercent}
            >
              <div
                className="bg-primary motion-progress h-full w-full rounded-full"
                style={{
                  transform: `scaleX(${book.progressPercent / 100})`,
                }}
              />
            </div>
          </div>

          {book.status === BookStatus.READING && (
            <p className="text-muted-foreground mt-2 text-xs">
              {remainingPages} pages remaining. Log reading to update progress.
            </p>
          )}

          {book.status === BookStatus.COMPLETED && book.completedAt && (
            <p className="text-muted-foreground mt-2 text-xs">
              Finished {book.completedAt.toLocaleDateString()}
            </p>
          )}

          {book.status === BookStatus.QUEUED && hasCurrentReading && (
            <p className="text-muted-foreground mt-2 text-xs">
              Move your current book back to the queue before starting this one.
            </p>
          )}

          {error && (
            <p className="text-destructive mt-3 text-sm" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:flex-nowrap sm:justify-end">
          {book.status === BookStatus.READING && (
            <>
              <Link
                href="/sessions"
                className="bg-primary text-primary-foreground hover:bg-primary/90 motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors"
              >
                <BookOpen className="size-4" aria-hidden="true" />
                Log reading
              </Link>
              <button
                type="button"
                onClick={() =>
                  handleAction(() => requeueBook({ bookId: book.id }))
                }
                disabled={isPending}
                className="border-border bg-background text-foreground hover:bg-muted motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Undo2 className="size-4" aria-hidden="true" />
                )}
                Move to queue
              </button>
            </>
          )}

          {book.status === BookStatus.QUEUED && (
            <button
              type="button"
              onClick={() => handleAction(() => startBook({ bookId: book.id }))}
              disabled={isPending || !canStartQueuedBook}
              title={
                canStartQueuedBook
                  ? "Start reading this book"
                  : "Move your current book back to the queue first"
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90 motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
              Start reading
            </button>
          )}

          {book.status !== BookStatus.COMPLETED && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={isPending}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive motion-press inline-flex size-11 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                  aria-label={`Remove ${book.title} from library`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this book?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {book.title} will be removed from your library. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep book</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      handleAction(() => deleteBook({ bookId: book.id }))
                    }
                  >
                    Remove book
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {book.status === BookStatus.COMPLETED && (
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
                  className="border-border bg-background text-foreground hover:bg-muted motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Reopen
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reopen {book.title}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter the page you were actually on. If another book is
                    active, this one will return to Up next instead.
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
                    placeholder={`0-${book.totalPages - 1}`}
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
                    Reopen book
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </article>
  );
}
