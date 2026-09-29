"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { createBook } from "@/features/books/ui/book-actions";
import { cn } from "@/lib/utils";

interface CreateBookFormProps {
  onSuccess?: () => void;
}

export function CreateBookForm({ onSuccess }: CreateBookFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!author.trim()) newErrors.author = "Author is required";
    const pages = parseInt(totalPages, 10);
    if (!totalPages.trim()) newErrors.totalPages = "Total pages is required";
    else if (isNaN(pages) || pages <= 0)
      newErrors.totalPages = "Total pages must be a positive number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await createBook({
        title: title.trim(),
        author: author.trim(),
        totalPages: parseInt(totalPages, 10),
      });
      setTitle("");
      setAuthor("");
      setTotalPages("");
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create book:", error);
      setErrors({ form: "Failed to create book. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add Book
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setIsOpen(false)}
      />
      <div className="bg-card border-border relative w-full max-w-md rounded-xl border p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground text-xl font-semibold">
            Add New Book
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {errors.form}
            </div>
          )}

          <div>
            <label
              htmlFor="title"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                "bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none",
                errors.title && "border-destructive focus:ring-destructive",
              )}
              placeholder="Book title"
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-destructive mt-1 text-sm">{errors.title}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="author"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              Author
            </label>
            <input
              id="author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className={cn(
                "bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none",
                errors.author && "border-destructive focus:ring-destructive",
              )}
              placeholder="Author name"
              disabled={isSubmitting}
            />
            {errors.author && (
              <p className="text-destructive mt-1 text-sm">{errors.author}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="totalPages"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              Total Pages
            </label>
            <input
              id="totalPages"
              type="number"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              min="1"
              className={cn(
                "bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none",
                errors.totalPages &&
                  "border-destructive focus:ring-destructive",
              )}
              placeholder="300"
              disabled={isSubmitting}
            />
            {errors.totalPages && (
              <p className="text-destructive mt-1 text-sm">
                {errors.totalPages}
              </p>
            )}
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
              Add Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
