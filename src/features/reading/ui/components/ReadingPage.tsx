import Link from "next/link";
import type { BookView } from "@/features/books/ui/book-view";
import { LogReadingForm } from "./LogReadingForm";
import { SessionList, type SessionData } from "./SessionList";

export function ReadingPage({
  currentBook,
  dailyTarget,
  recentSessions,
  timezone,
}: {
  currentBook: BookView | null;
  dailyTarget: number;
  recentSessions: SessionData[];
  timezone: string;
}) {
  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <p className="text-primary text-sm font-medium">Reading</p>
        <h1 className="text-foreground mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Save where you stopped.
        </h1>
        <p className="text-muted-foreground mt-2">
          Enter the last page you finished. Reading Buddy calculates the pages
          read and updates your book progress, today&apos;s goal, and streak
          automatically.
        </p>
      </header>

      {currentBook?.epubProgress ? (
        <section className="border-border space-y-3 rounded-xl border p-5">
          <h2 className="font-semibold">Continue {currentBook.title}</h2>
          <p className="text-muted-foreground text-sm">
            EPUBs use reading locations. Finish a session in the reader to
            update your streak without inventing paper pages.
          </p>
          <Link href="/books" className="text-primary underline">
            Open your library reader
          </Link>
        </section>
      ) : (
        <LogReadingForm currentBook={currentBook} dailyTarget={dailyTarget} />
      )}

      <section className="border-border border-t pt-8">
        <div className="mb-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            History
          </p>
          <h2 className="text-foreground mt-1 text-xl font-semibold">
            Recent reading
          </h2>
        </div>
        <SessionList sessions={recentSessions} timezone={timezone} />
      </section>
    </div>
  );
}
