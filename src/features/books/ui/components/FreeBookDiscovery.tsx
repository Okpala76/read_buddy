"use client";

import { useState } from "react";
import {
  addFreeBook,
  searchFreeBooks,
} from "@/features/books/ui/free-book-actions";
import type { FreeBook } from "@/features/books/infrastructure/gutendex";

export function FreeBookDiscovery() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [books, setBooks] = useState<FreeBook[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<FreeBook | null>(null);
  const [addedIds, setAddedIds] = useState<number[]>([]);

  async function search(nextPage = 1) {
    setBusy(true);
    setError("");
    try {
      const result = await searchFreeBooks({
        query: query.trim(),
        page: nextPage,
      });
      if (!result.ok) {
        setError(result.error);
        setBooks([]);
        setCount(0);
        setHasNext(false);
        return;
      }
      setBooks(result.data.books);
      setCount(result.data.count);
      setHasNext(result.data.hasNext);
      setPage(nextPage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function addBook() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const result = await addFreeBook({
        gutenbergId: selected.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAddedIds((ids) => [...ids, selected.id]);
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add book");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="border-border bg-card hover:bg-muted min-h-11 rounded-lg border px-4 text-sm font-medium"
      >
        {open ? "Hide free books" : "Discover free books"}
      </button>
      {open && (
        <div className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold">Discover free books</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Browse 25 verified free EPUBs. Add one to your library and read
              directly inside ReadOn, with your position saved.
            </p>
          </div>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void search(1);
            }}
          >
            <input
              aria-label="Search free books"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search free books"
              maxLength={100}
              className="bg-background min-h-11 min-w-0 flex-1 rounded-lg border px-3"
            />
            <button
              disabled={busy}
              type="submit"
              className="bg-primary text-primary-foreground min-h-11 rounded-lg px-4 disabled:opacity-50"
            >
              Search
            </button>
          </form>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          {count > 0 && (
            <p className="text-muted-foreground text-sm">
              {count.toLocaleString()} matching books
            </p>
          )}
          {books.length === 0 && count === 0 && !busy && (
            <p className="text-muted-foreground text-sm">
              Search by title or author to explore the catalog.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {books.map((book) => (
              <article
                key={book.id}
                className="border-border flex flex-col justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <h3 className="font-semibold">{book.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {book.author}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    EPUB available · Free to read
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy || addedIds.includes(book.id)}
                  onClick={() => {
                    setSelected(book);
                    setError("");
                  }}
                  className="border-border min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50"
                >
                  {addedIds.includes(book.id)
                    ? "Added to library"
                    : "Add to library"}
                </button>
              </article>
            ))}
          </div>
          {books.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={busy || page === 1}
                onClick={() => void search(page - 1)}
                className="min-h-11 rounded-lg border px-4 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm">Page {page}</span>
              <button
                type="button"
                disabled={busy || !hasNext}
                onClick={() => void search(page + 1)}
                className="min-h-11 rounded-lg border px-4 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
          {selected && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Add free book"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            >
              <div className="bg-card w-full max-w-md space-y-4 rounded-xl p-6">
                <h3 className="text-lg font-semibold">Add {selected.title}</h3>
                <p className="text-muted-foreground text-sm">
                  Read this EPUB directly inside ReadOn. Its reading position
                  will be saved automatically.
                </p>
                {error && (
                  <p role="alert" className="text-destructive text-sm">
                    {error}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSelected(null);
                      setError("");
                    }}
                    className="min-h-11 flex-1 rounded-lg border px-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void addBook()}
                    className="bg-primary text-primary-foreground min-h-11 flex-1 rounded-lg px-3 disabled:opacity-50"
                  >
                    {busy ? "Adding…" : "Add EPUB"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
