"use client";

import { useState } from "react";
import { addFreeBook, searchFreeBooks } from "@/features/books/ui/free-book-actions";
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
  const [totalPages, setTotalPages] = useState("");
  const [addedIds, setAddedIds] = useState<number[]>([]);

  async function search(nextPage = 1) {
    if (query.trim().length < 2) {
      setError("Enter at least two characters");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await searchFreeBooks({ query: query.trim(), page: nextPage });
      setBooks(result.books);
      setCount(result.count);
      setHasNext(result.hasNext);
      setPage(nextPage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function addBook() {
    if (!selected) return;
    const pages = Number(totalPages);
    if (!Number.isInteger(pages) || pages < 1) {
      setError("Enter a positive whole-number page count");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addFreeBook({ gutendexId: selected.id, totalPages: pages });
      setAddedIds((ids) => [...ids, selected.id]);
      setSelected(null);
      setTotalPages("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add book");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <button type="button" onClick={() => setOpen(!open)} className="border-border bg-card hover:bg-muted min-h-11 rounded-lg border px-4 text-sm font-medium">
        {open ? "Hide free books" : "Discover free books"}
      </button>
      {open && (
        <div className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold">Discover free books</h2>
            <p className="text-muted-foreground mt-1 text-sm">Search Project Gutenberg’s public-domain catalog via Gutendex. Adding a title saves its details to your library; EPUB reading is coming next.</p>
          </div>
          <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void search(1); }}>
            <input aria-label="Search free books" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title or author" maxLength={100} className="bg-background min-h-11 min-w-0 flex-1 rounded-lg border px-3" />
            <button disabled={busy} type="submit" className="bg-primary text-primary-foreground min-h-11 rounded-lg px-4 disabled:opacity-50">Search</button>
          </form>
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          {count > 0 && <p className="text-muted-foreground text-sm">{count.toLocaleString()} matching books</p>}
          {books.length === 0 && count === 0 && !busy && <p className="text-muted-foreground text-sm">Search by title or author to explore the catalog.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {books.map((book) => (
              <article key={book.id} className="border-border flex flex-col justify-between gap-3 rounded-xl border p-4">
                <div>
                  <h3 className="font-semibold">{book.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{book.author}</p>
                  <p className="text-muted-foreground mt-2 text-xs">{book.epubAvailable ? "EPUB available from Gutenberg" : "Catalog listing"} · {book.downloads.toLocaleString()} downloads</p>
                </div>
                <button type="button" disabled={busy || addedIds.includes(book.id)} onClick={() => { setSelected(book); setTotalPages(""); setError(""); }} className="border-border min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50">
                  {addedIds.includes(book.id) ? "Added to library" : "Add to library"}
                </button>
              </article>
            ))}
          </div>
          {books.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <button type="button" disabled={busy || page === 1} onClick={() => void search(page - 1)} className="min-h-11 rounded-lg border px-4 disabled:opacity-40">Previous</button>
              <span className="text-sm">Page {page}</span>
              <button type="button" disabled={busy || !hasNext} onClick={() => void search(page + 1)} className="min-h-11 rounded-lg border px-4 disabled:opacity-40">Next</button>
            </div>
          )}
          {selected && (
            <div role="dialog" aria-modal="true" aria-label="Add free book" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-card w-full max-w-md space-y-4 rounded-xl p-6">
                <h3 className="text-lg font-semibold">Add {selected.title}</h3>
                <p className="text-muted-foreground text-sm">Gutendex does not provide a reliable page count. Enter the number of pages in the edition you plan to read. You can add it to your queue now; digital reading support is next.</p>
                <label className="block text-sm font-medium" htmlFor="free-book-pages">Total pages</label>
                <input id="free-book-pages" type="number" min="1" max="100000" step="1" value={totalPages} onChange={(event) => setTotalPages(event.target.value)} className="bg-background min-h-11 w-full rounded-lg border px-3" />
                {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => { setSelected(null); setError(""); }} className="min-h-11 flex-1 rounded-lg border px-3">Cancel</button>
                  <button type="button" disabled={busy} onClick={() => void addBook()} className="bg-primary text-primary-foreground min-h-11 flex-1 rounded-lg px-3 disabled:opacity-50">{busy ? "Adding…" : "Add to queue"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
