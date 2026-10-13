"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Target,
} from "lucide-react";

import { ReadingMood } from "@/features/reading/domain";
import { logReading } from "@/features/reading/ui/reading-actions";
import { cn } from "@/lib/utils";

interface LogReadingFormProps {
  currentBook: {
    id: string;
    title: string;
    author?: string;
    currentPage: number;
    totalPages: number;
  } | null;
  dailyTarget: number;
}

const moodLabels: Record<ReadingMood, string> = {
  FOCUSED: "Focused",
  RELAXED: "Relaxed",
  ENERGIZED: "Energized",
  DISTRACTED: "Distracted",
  TIRED: "Tired",
};

export function LogReadingForm({
  currentBook,
  dailyTarget,
}: LogReadingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pages, setPages] = useState("");
  const [mood, setMood] = useState<ReadingMood | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const maxPages = currentBook
    ? Math.max(0, currentBook.totalPages - currentBook.currentPage)
    : 0;
  const submittedPages = Number.parseInt(pages, 10) || 0;
  const willFinishBook = maxPages > 0 && submittedPages === maxPages;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentBook) {
      setError("Choose an active book before logging reading.");
      return;
    }

    const parsedPages = Number.parseInt(pages, 10);
    if (Number.isNaN(parsedPages) || parsedPages <= 0) {
      setError("Enter the number of pages you read.");
      return;
    }

    if (parsedPages > maxPages) {
      setError(`This book only has ${maxPages} pages remaining.`);
      return;
    }

    const completedBook = parsedPages === maxPages;

    setIsSubmitting(true);
    try {
      await logReading({
        bookId: currentBook.id,
        submittedPages: parsedPages,
        mood,
      });

      setPages("");
      setMood(null);
      setSuccess(
        completedBook
          ? `${parsedPages} pages logged. You finished ${currentBook.title}.`
          : `${parsedPages} pages logged. Your progress is up to date.`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Reading could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!currentBook) {
    return (
      <section className="border-border bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
        {success && (
          <div
            className="bg-primary/10 text-primary motion-feedback-in mb-5 flex items-start gap-3 rounded-xl p-4 text-sm"
            role="status"
          >
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <span>{success}</span>
          </div>
        )}

        <div className="bg-primary/10 text-primary mb-5 grid size-12 place-items-center rounded-2xl">
          <BookOpen className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-foreground text-xl font-semibold">
          Choose a book before you log reading
        </h2>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Start a book from your library and it will become the active book for
          your next reading session.
        </p>
        <Link
          href="/books"
          className="bg-primary text-primary-foreground hover:bg-primary/90 motion-press mt-6 inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors"
        >
          Choose a book
        </Link>
      </section>
    );
  }

  const progressPercent = Math.min(
    100,
    Math.round((currentBook.currentPage / currentBook.totalPages) * 100),
  );

  return (
    <section className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="border-border bg-muted/35 border-b p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-primary text-sm font-medium">Current book</p>
            <h2 className="text-foreground mt-1 truncate text-xl font-semibold sm:text-2xl">
              {currentBook.title}
            </h2>
            {currentBook.author && (
              <p className="text-muted-foreground mt-1 text-sm">
                {currentBook.author}
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <p className="text-foreground text-sm font-medium">
              Page {currentBook.currentPage} of {currentBook.totalPages}
            </p>
            <p className="text-muted-foreground text-xs">
              {maxPages} pages remaining
            </p>
          </div>
        </div>

        <div
          className="bg-background mt-4 h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-label="Book progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div
            className="bg-primary motion-progress h-full w-full rounded-full"
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
        {success && (
          <div
            className="bg-primary/10 text-primary motion-feedback-in flex items-start gap-3 rounded-xl p-4 text-sm"
            role="status"
          >
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div
            className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <div>
          <div className="flex items-end justify-between gap-4">
            <label
              htmlFor="pages"
              className="text-foreground text-base font-semibold"
            >
              Pages read
            </label>
            <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Target className="size-4" aria-hidden="true" />
              Daily target: {dailyTarget}
            </div>
          </div>

          <div className="border-input focus-within:ring-ring bg-background mt-2 flex items-center rounded-xl border px-4 focus-within:ring-2 focus-within:ring-offset-2">
            <input
              id="pages"
              type="number"
              inputMode="numeric"
              min={1}
              max={maxPages}
              value={pages}
              onChange={(event) => {
                setPages(event.target.value);
                setError(null);
                setSuccess(null);
              }}
              placeholder={String(
                Math.min(dailyTarget, maxPages || dailyTarget),
              )}
              disabled={isSubmitting}
              autoFocus
              className="text-foreground h-16 min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none disabled:opacity-60"
            />
            <span className="text-muted-foreground text-sm">pages</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-muted-foreground">
              Enter only what you read in this session.
            </p>
            {willFinishBook && (
              <p className="text-primary font-medium">
                This will finish the book.
              </p>
            )}
          </div>
        </div>

        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg text-sm font-medium transition-colors">
            <span>
              Add how the session felt{" "}
              <span className="font-normal">(optional)</span>
            </span>
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="mt-2 flex flex-wrap gap-2" aria-label="Reading mood">
            {(Object.values(ReadingMood) as ReadingMood[]).map((item) => {
              const selected = mood === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMood(selected ? null : item)}
                  className={cn(
                    "motion-press min-h-11 rounded-full border px-3 text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {moodLabels[item]}
                </button>
              );
            })}
          </div>
        </details>

        <button
          type="submit"
          disabled={isSubmitting || maxPages <= 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring motion-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {isSubmitting
            ? "Saving…"
            : willFinishBook
              ? "Log reading and finish book"
              : submittedPages > 0
                ? `Save ${submittedPages} pages`
                : "Save reading"}
        </button>
      </form>
    </section>
  );
}
