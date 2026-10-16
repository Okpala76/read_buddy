"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { createBook } from "@/features/books/ui/book-actions";
import { cn } from "@/lib/utils";

interface CreateBookFormProps {
  hasCurrentReading: boolean;
}

export function CreateBookForm({ hasCurrentReading }: CreateBookFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [alreadyReading, setAlreadyReading] = useState(false);
  const [lastFinishedPage, setLastFinishedPage] = useState("");
  const [startNow, setStartNow] = useState(!hasCurrentReading);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const total = Number(totalPages);
    const initial = Number(lastFinishedPage);

    if (!title.trim()) newErrors.title = "Title is required";
    if (!author.trim()) newErrors.author = "Author is required";
    if (!totalPages.trim() || !Number.isInteger(total) || total <= 0) {
      newErrors.totalPages = "Enter a valid total page count";
    }
    if (
      alreadyReading &&
      (!lastFinishedPage.trim() ||
        !Number.isInteger(initial) ||
        initial < 1 ||
        (Number.isInteger(total) && total > 0 && initial >= total))
    ) {
      newErrors.lastFinishedPage =
        "Enter the last page you finished (before the final page)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      await createBook({
        title: title.trim(),
        author: author.trim(),
        totalPages: Number(totalPages),
        initialPage: alreadyReading ? Number(lastFinishedPage) : 0,
        startNow: startNow && !hasCurrentReading,
      });
      setTitle("");
      setAuthor("");
      setTotalPages("");
      setAlreadyReading(false);
      setLastFinishedPage("");
      setStartNow(!hasCurrentReading);
      setIsOpen(false);
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Failed to add book. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setStartNow(!hasCurrentReading);
          setIsOpen(true);
        }}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add book
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => !isSubmitting && setIsOpen(false)}
        aria-hidden="true"
      />
      <div
        className="bg-card border-border relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border p-5 shadow-xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-book-title"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="create-book-title" className="text-foreground text-xl font-semibold">
            Add a book
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground inline-flex size-11 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close add book dialog"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm" role="alert">
              {errors.form}
            </div>
          )}

          <div>
            <label htmlFor="title" className="text-foreground mb-1 block text-sm font-medium">
              Book title
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={cn(
                "bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-11 w-full rounded-lg border px-3 focus:ring-2 focus:outline-none",
                errors.title && "border-destructive",
              )}
              placeholder="Book title"
              disabled={isSubmitting}
            />
            {errors.title && <p className="text-destructive mt-1 text-sm">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="author" className="text-foreground mb-1 block text-sm font-medium">
              Author
            </label>
            <input
              id="author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              className={cn(
                "bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-11 w-full rounded-lg border px-3 focus:ring-2 focus:outline-none",
                errors.author && "border-destructive",
              )}
              placeholder="Author name"
              disabled={isSubmitting}
            />
            {errors.author && <p className="text-destructive mt-1 text-sm">{errors.author}</p>}
          </div>

          <div>
            <label htmlFor="totalPages" className="text-foreground mb-1 block text-sm font-medium">
              Total pages
            </label>
            <input
              id="totalPages"
              type="number"
              min="1"
              step="1"
              value={totalPages}
              onChange={(event) => setTotalPages(event.target.value)}
              className={cn(
                "bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-11 w-full rounded-lg border px-3 focus:ring-2 focus:outline-none",
                errors.totalPages && "border-destructive",
              )}
              placeholder="300"
              disabled={isSubmitting}
            />
            {errors.totalPages && (
              <p className="text-destructive mt-1 text-sm">{errors.totalPages}</p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-foreground mb-2 text-sm font-semibold">
              Where are you with this book?
            </legend>
            <label className={cn(
              "border-border flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              !alreadyReading && "border-primary bg-primary/5",
            )}>
              <input
                type="radio"
                name="reading-start"
                checked={!alreadyReading}
                onChange={() => setAlreadyReading(false)}
                disabled={isSubmitting}
              />
              Starting from the beginning
            </label>
            <label className={cn(
              "border-border flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              alreadyReading && "border-primary bg-primary/5",
            )}>
              <input
                type="radio"
                name="reading-start"
                checked={alreadyReading}
                onChange={() => setAlreadyReading(true)}
                disabled={isSubmitting}
              />
              Already reading this book
            </label>
          </fieldset>

          {alreadyReading && (
            <div>
              <label htmlFor="lastFinishedPage" className="text-foreground mb-1 block text-sm font-medium">
                Last page you finished
              </label>
              <input
                id="lastFinishedPage"
                type="number"
                min="1"
                step="1"
                max={Number(totalPages) > 0 ? Number(totalPages) - 1 : undefined}
                value={lastFinishedPage}
                onChange={(event) => setLastFinishedPage(event.target.value)}
                className={cn(
                  "bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-11 w-full rounded-lg border px-3 focus:ring-2 focus:outline-none",
                  errors.lastFinishedPage && "border-destructive",
                )}
                placeholder="85"
                disabled={isSubmitting}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                We'll pick up after this page. Earlier pages count toward book progress, not your in-app reading history.
              </p>
              {errors.lastFinishedPage && (
                <p className="text-destructive mt-1 text-sm">{errors.lastFinishedPage}</p>
              )}
            </div>
          )}

          {hasCurrentReading ? (
            <p className="bg-muted/60 text-muted-foreground rounded-lg p-3 text-sm">
              You already have an active book. This one will go in Up next.
            </p>
          ) : (
            <label className="text-foreground flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={startNow}
                onChange={(event) => setStartNow(event.target.checked)}
                disabled={isSubmitting}
              />
              Make this my current book
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="border-border bg-background text-foreground hover:bg-muted min-h-11 flex-1 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {startNow && !hasCurrentReading ? "Add and start" : "Add to library"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
