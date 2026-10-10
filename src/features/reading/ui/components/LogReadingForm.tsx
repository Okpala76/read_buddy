"use client";

import { useState } from "react";
import {
  Loader2,
  Minus,
  Plus,
  X,
  Target,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { ReadingMood } from "@/features/reading/domain";
import { logReading } from "@/features/reading/ui/reading-actions";
import { cn } from "@/lib/utils";

interface MoodButtonProps {
  mood: ReadingMood;
  selected: ReadingMood | null;
  onSelect: (mood: ReadingMood | null) => void;
}

export function MoodButton({ mood, selected, onSelect }: MoodButtonProps) {
  const isSelected = selected === mood;

  const moodLabels: Record<ReadingMood, string> = {
    FOCUSED: "Focused",
    RELAXED: "Relaxed",
    ENERGIZED: "Energized",
    DISTRACTED: "Distracted",
    TIRED: "Tired",
  };

  const moodIcons: Record<ReadingMood, React.ReactNode> = {
    FOCUSED: <Target className="size-4" />,
    RELAXED: <CheckCircle className="size-4" />,
    ENERGIZED: <Plus className="size-4" />,
    DISTRACTED: <AlertCircle className="size-4" />,
    TIRED: <Minus className="size-4" />,
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(isSelected ? null : mood)}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-all",
        isSelected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5",
      )}
      role="radio"
      aria-checked={isSelected}
    >
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-full",
          isSelected ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {moodIcons[mood]}
      </div>
      <span className="text-xs font-medium">{moodLabels[mood]}</span>
      {isSelected && (
        <div className="bg-primary absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" />
      )}
    </button>
  );
}

interface LogReadingFormProps {
  currentBook: {
    id: string;
    title: string;
    currentPage: number;
    totalPages: number;
  } | null;
  dailyTarget: number;
}

export function LogReadingForm({
  currentBook,
  dailyTarget,
}: LogReadingFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pages, setPages] = useState("");
  const [mood, setMood] = useState<ReadingMood | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxPages = currentBook
    ? currentBook.totalPages - currentBook.currentPage
    : 0;
  const submittedPages = Number.parseInt(pages, 10) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentBook) {
      setError("No book currently being read");
      return;
    }

    const submittedPages = parseInt(pages, 10);
    if (isNaN(submittedPages) || submittedPages <= 0) {
      setError("Please enter a valid number of pages");
      return;
    }

    setIsSubmitting(true);
    try {
      await logReading({
        bookId: currentBook.id,
        submittedPages,
        mood,
      });
      setPages("");
      setMood(null);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log reading");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentBook) {
    return (
      <div className="border-border bg-muted/50 rounded-lg border p-4 text-center">
        <Target
          className="text-muted-foreground mx-auto mb-2 size-8"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">No book currently being read</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Start a book from your queue to log reading progress
        </p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Target className="size-5" aria-hidden="true" />
        Log Reading
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setIsOpen(false)}
      />
      <div
        className="bg-card border-border relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border p-5 shadow-xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-reading-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="log-reading-title"
            className="text-foreground text-xl font-semibold"
          >
            Log Reading Progress
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Close log reading dialog"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-foreground text-sm font-medium">
              {currentBook.title}
            </p>
            <p className="text-muted-foreground text-sm">
              Page {currentBook.currentPage} of {currentBook.totalPages} •{" "}
              {maxPages} pages remaining
            </p>
            {submittedPages >= maxPages && maxPages > 0 && (
              <p className="text-primary mt-1 text-xs">
                This will complete the book.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="pages"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              Pages Read
            </label>
            <div className="flex items-center gap-2">
              <input
                id="pages"
                type="number"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                min="1"
                max={maxPages}
                className={cn(
                  "bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none",
                )}
                placeholder={dailyTarget.toString()}
                disabled={isSubmitting}
              />
              <span className="text-muted-foreground">/ {maxPages}</span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Daily target: {dailyTarget} pages
            </p>
          </div>

          <div>
            <label className="text-foreground mb-2 block text-sm font-medium">
              Mood (optional)
            </label>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Reading mood"
            >
              {(Object.values(ReadingMood) as ReadingMood[]).map((m) => (
                <MoodButton
                  key={m}
                  mood={m}
                  selected={mood}
                  onSelect={setMood}
                />
              ))}
              <button
                type="button"
                onClick={() => setMood(null)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-all",
                  mood === null
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5",
                )}
                role="radio"
                aria-checked={mood === null}
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full",
                    mood === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <X className="size-4" aria-hidden="true" />
                </div>
                <span className="text-xs font-medium">None</span>
                {mood === null && (
                  <div className="bg-primary absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="border-border bg-background text-foreground hover:bg-muted flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
            >
              {isSubmitting && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {submittedPages >= maxPages && maxPages > 0
                ? "Log and finish book"
                : `Log ${pages || "Reading"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
