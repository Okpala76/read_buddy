import { BookStatus } from "@/features/books/domain";
import type { BookView } from "@/features/books/ui/book-view";
import { LogReadingForm } from "./LogReadingForm";
import { SessionList, type SessionData } from "./SessionList";
import { Target, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const progressPercent = currentBook
    ? Math.round((currentBook.currentPage / currentBook.totalPages) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Reading Sessions
        </h1>
        <p className="text-muted-foreground mt-1">
          Log your progress and review your recent reading.
        </p>
      </header>

      {/* Current Reading Book */}
      {currentBook && (
        <section
          className={cn(
            "border-border bg-card rounded-xl border p-4 sm:p-6",
            currentBook.status === BookStatus.READING &&
              "ring-primary/50 ring-2",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <BookOpen
                  className={cn(
                    "size-5",
                    currentBook.status === BookStatus.READING
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <h2 className="text-foreground text-xl font-semibold">
                  {currentBook.title}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    currentBook.status === BookStatus.READING &&
                      "bg-primary/10 text-primary border-primary/20",
                  )}
                >
                  {currentBook.status}
                </span>
              </div>
              <p className="text-muted-foreground mb-4">{currentBook.author}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-medium">
                    {currentBook.currentPage} / {currentBook.totalPages} pages
                  </span>
                </div>
                <div className="bg-muted h-3 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>{progressPercent}% complete</span>
                  <span>
                    {currentBook.totalPages - currentBook.currentPage} pages
                    remaining
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Daily Target & Log Reading */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="text-primary size-5" aria-hidden="true" />
            <h2 className="text-foreground text-xl font-semibold">
              Daily Target: {dailyTarget} pages
            </h2>
          </div>
        </div>

        <LogReadingForm currentBook={currentBook} dailyTarget={dailyTarget} />
      </section>

      {/* Recent Sessions */}
      <section>
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          Recent Sessions
        </h2>
        <SessionList sessions={recentSessions} timezone={timezone} />
      </section>
    </div>
  );
}
