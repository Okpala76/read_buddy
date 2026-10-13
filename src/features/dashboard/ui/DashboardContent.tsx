import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  Library,
  Target,
} from "lucide-react";

import type { BookView } from "@/features/books/ui/book-view";
import { PushAdoptionPrompt } from "@/features/push-notifications/ui/PushAdoptionPrompt";

interface DashboardContentProps {
  currentBook: BookView | null;
  queuedBooks: BookView[];
  queuedBookCount: number;
  dailyTarget: number;
  pagesReadToday: number;
  currentStreak: number;
  timezone: string;
  reminderSettings: {
    enabled: boolean;
    emailEnabled: boolean;
  };
}

export function DashboardContent({
  currentBook,
  queuedBooks,
  queuedBookCount,
  dailyTarget,
  pagesReadToday,
  currentStreak,
  timezone,
  reminderSettings,
}: DashboardContentProps) {
  const safeTarget = Math.max(1, dailyTarget);
  const dailyProgress = Math.min(
    100,
    Math.round((pagesReadToday / safeTarget) * 100),
  );
  const dailyGoalComplete = pagesReadToday >= safeTarget;
  const hasReadToday = pagesReadToday > 0;
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date());

  const bookProgress = currentBook
    ? Math.min(
        100,
        Math.round((currentBook.currentPage / currentBook.totalPages) * 100),
      )
    : 0;

  const streakMessage = hasReadToday
    ? "Streak protected today"
    : currentStreak > 0
      ? "Read today to keep it going"
      : "Start a new streak today";

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            {todayLabel}
          </p>
          <h1 className="text-foreground mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {currentBook
              ? "Pick up where you left off."
              : "Choose what you want to read next."}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            {currentBook
              ? "Your current book, today’s progress, and reading rhythm are all in one place."
              : "Start a book to make today’s reading goal easier to act on."}
          </p>
        </div>
      </header>

      {currentBook ? (
        <section className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="text-primary mb-6 flex items-center gap-2 text-sm font-medium">
                <span className="bg-primary size-2 rounded-full" aria-hidden="true" />
                Currently reading
              </div>

              <div className="max-w-2xl">
                <p className="text-muted-foreground text-sm">
                  {currentBook.author}
                </p>
                <h2 className="text-foreground mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {currentBook.title}
                </h2>

                <div className="mt-7 space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-foreground font-medium">
                      {currentBook.currentPage} of {currentBook.totalPages} pages
                    </span>
                    <span className="text-muted-foreground">
                      {bookProgress}% complete
                    </span>
                  </div>
                  <div
                    className="bg-muted h-2.5 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-label="Book progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={bookProgress}
                  >
                    <div
                      className="bg-primary h-full rounded-full motion-progress"
                      style={{ width: `${bookProgress}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {Math.max(
                      0,
                      currentBook.totalPages - currentBook.currentPage,
                    )}{" "}
                    pages left in this book
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/sessions"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors motion-press"
                >
                  <BookOpen className="size-4" aria-hidden="true" />
                  Log reading
                </Link>
                <Link
                  href="/books"
                  className="border-border bg-background hover:bg-muted inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors motion-press"
                >
                  View book
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="bg-muted/45 border-border border-t p-5 sm:p-7 lg:border-t-0 lg:border-l lg:p-8">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      Today
                    </p>
                    <p className="text-foreground mt-2 text-3xl font-semibold tracking-tight">
                      {pagesReadToday}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      of {dailyTarget} pages
                    </p>
                  </div>
                  <div className="bg-card border-border grid size-14 place-items-center rounded-full border">
                    <span className="text-primary text-sm font-semibold">
                      {dailyProgress}%
                    </span>
                  </div>
                </div>

                <div
                  className="bg-card mt-4 h-2 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-label="Daily reading target"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={dailyProgress}
                >
                  <div
                    className="bg-primary/70 h-full rounded-full motion-progress"
                    style={{ width: `${dailyProgress}%` }}
                  />
                </div>

                {dailyGoalComplete && (
                  <p className="text-primary mt-3 flex items-center gap-2 text-sm font-medium motion-feedback-in">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Daily goal complete
                  </p>
                )}
              </div>

              <div className="border-border my-7 border-t" />

              <div className="flex items-center gap-4">
                <div className="bg-card border-border text-primary grid size-12 place-items-center rounded-2xl border">
                  <Flame className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-foreground text-2xl font-semibold tracking-tight">
                      {currentStreak} {currentStreak === 1 ? "day" : "days"}
                    </p>
                    {hasReadToday && currentStreak > 0 && (
                      <span className="text-primary text-xs font-semibold tracking-wide uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {streakMessage}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-border bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
          <div className="max-w-2xl">
            <div className="bg-primary/10 text-primary mb-5 grid size-12 place-items-center rounded-2xl">
              <Library className="size-6" aria-hidden="true" />
            </div>
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              No book is active right now
            </h2>
            <p className="text-muted-foreground mt-2">
              Choose a book from your library and Reading Buddy will make it the
              focus of your Home screen.
            </p>
            <Link
              href="/books"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors motion-press"
            >
              Choose a book
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Next up
            </p>
            <h2 className="text-foreground mt-1 text-xl font-semibold">
              Your reading queue
            </h2>
          </div>
          {queuedBookCount > 0 && (
            <Link href="/books" className="text-primary text-sm font-semibold">
              View library
            </Link>
          )}
        </div>

        <div className="border-border bg-card overflow-hidden rounded-2xl border">
          {queuedBooks.length === 0 ? (
            <div className="p-6 sm:p-7">
              <p className="text-foreground font-medium">
                Your queue is clear.
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Add another book when you know what you want to read next.
              </p>
              <Link
                href="/books"
                className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold"
              >
                Add a book
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {queuedBooks.map((book) => (
                <li key={book.id}>
                  <Link
                    href="/books"
                    className="hover:bg-muted/50 flex items-center gap-4 p-4 transition-colors sm:px-5"
                  >
                    <div className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
                      <BookOpen className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate font-medium">
                        {book.title}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">
                        {book.author} · {book.totalPages} pages
                      </p>
                    </div>
                    <ArrowRight
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="border-border bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
              <Target className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-foreground font-medium">
                {dailyGoalComplete
                  ? "Today’s goal is complete"
                  : `${Math.max(0, dailyTarget - pagesReadToday)} pages to today’s goal`}
              </p>
              <p className="text-muted-foreground text-sm">
                Small daily progress keeps the habit easy to continue.
              </p>
            </div>
          </div>
        </div>

        <div className="border-border bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
              <Flame className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-foreground font-medium">
                {currentStreak > 0
                  ? `${currentStreak}-day reading streak`
                  : "Build your reading rhythm"}
              </p>
              <Link
                href="/analytics"
                className="text-primary text-sm font-semibold"
              >
                See progress
              </Link>
            </div>
          </div>
        </div>
      </section>

      {currentBook && <PushAdoptionPrompt {...reminderSettings} />}
    </div>
  );
}
