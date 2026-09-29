"use client";

import { useEffect, useState } from "react";
import { Book, BookStatus } from "@/features/books/domain";
import {
  getCurrentReading,
  getBooks,
  getDailyTarget,
  getRecentReadingSessions,
} from "@/features/reading/ui/reading-actions";
import {
  Loader2,
  Target,
  BookOpen,
  Clock,
  Plus,
  Play,
  CheckCircle,
  Settings,
} from "lucide-react";

interface RecentSession {
  id: string;
  bookId: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  mood: "FOCUSED" | "RELAXED" | "ENERGIZED" | "DISTRACTED" | "TIRED" | null;
  readAt: Date;
  createdAt: Date;
}

export function DashboardContent() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [queuedBooks, setQueuedBooks] = useState<Book[]>([]);
  const [dailyTarget, setDailyTarget] = useState<number>(10);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setError(null);
        const [book, target, sessions, books] = await Promise.all([
          getCurrentReading(),
          getDailyTarget(),
          getRecentReadingSessions(5),
          getBooks(),
        ]);
        if (mounted) {
          setCurrentBook(book);
          setDailyTarget(target);
          setRecentSessions(sessions as RecentSession[]);
          setQueuedBooks(
            books.filter((b: Book) => b.status === BookStatus.QUEUED),
          );
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load dashboard data");
          console.error(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const progressPercent = currentBook
    ? Math.round((currentBook.currentPage / currentBook.totalPages) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2
          className="text-primary h-8 w-8 animate-spin"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Reading Book - Primary */}
      {currentBook && (
        <section className="border-border bg-card rounded-xl border p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="text-primary h-5 w-5" aria-hidden="true" />
                <h2 className="text-foreground text-xl font-semibold">
                  Currently Reading
                </h2>
                <span className="bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                  {currentBook.status}
                </span>
              </div>
              <p className="text-muted-foreground mb-4">{currentBook.author}</p>
              <h1 className="text-foreground mb-4 text-2xl font-semibold">
                {currentBook.title}
              </h1>

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
            <div className="flex items-center gap-2">
              <Target className="text-primary h-4 w-4" aria-hidden="true" />
              <span className="text-muted-foreground text-sm">
                Daily target: {dailyTarget} pages
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
              <Play className="h-4 w-4" aria-hidden="true" />
              Continue Reading
            </button>
            <button className="border-border bg-background hover:bg-muted inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Complete
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Target Progress */}
        <section className="border-border bg-card rounded-xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="text-primary h-5 w-5" aria-hidden="true" />
              <h2 className="text-foreground text-xl font-semibold">
                Daily Target
              </h2>
            </div>
            <span className="text-muted-foreground text-sm">
              {dailyTarget} pages
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pages today</span>
              <span className="text-foreground font-medium">
                {currentBook?.currentPage || 0} / {dailyTarget}
              </span>
            </div>
            <div className="bg-muted h-3 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round(((currentBook?.currentPage || 0) / dailyTarget) * 100))}%`,
                }}
              />
            </div>
          </div>
          {(!currentBook || currentBook.status !== BookStatus.READING) && (
            <p className="text-muted-foreground mt-2 text-sm">
              Start reading a book to track progress toward your daily target.
            </p>
          )}
        </section>

        {/* Quick Actions */}
        <section className="border-border bg-card rounded-xl border p-6">
          <h2 className="text-foreground mb-4 text-xl font-semibold">
            Quick Actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="/books/new"
              className="border-border bg-card hover:bg-muted flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <Plus className="text-primary h-5 w-5" aria-hidden="true" />
              <div>
                <p className="text-foreground font-medium">Add a Book</p>
                <p className="text-muted-foreground text-sm">
                  Add a new book to your queue
                </p>
              </div>
            </a>
            <a
              href="/books"
              className="border-border bg-card hover:bg-muted flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <BookOpen className="text-primary h-5 w-5" aria-hidden="true" />
              <div>
                <p className="text-foreground font-medium">Browse Queue</p>
                <p className="text-muted-foreground text-sm">
                  View and manage your books
                </p>
              </div>
            </a>
            <a
              href="/reading"
              className="border-border bg-card hover:bg-muted flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <Clock className="text-primary h-5 w-5" aria-hidden="true" />
              <div>
                <p className="text-foreground font-medium">Log Reading</p>
                <p className="text-muted-foreground text-sm">
                  Record a reading session
                </p>
              </div>
            </a>
            <a
              href="/settings"
              className="border-border bg-card hover:bg-muted flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <Settings className="text-primary h-5 w-5" aria-hidden="true" />
              <div>
                <p className="text-foreground font-medium">Settings</p>
                <p className="text-muted-foreground text-sm">
                  Manage preferences and reminders
                </p>
              </div>
            </a>
          </div>
        </section>
      </div>

      {/* Queued Books - Secondary */}
      <section className="border-border bg-card rounded-xl border">
        <div className="border-border border-b p-6">
          <h2 className="text-foreground text-xl font-semibold">
            Queued Books
          </h2>
        </div>
        <div className="divide-border divide-y">
          {queuedBooks.length === 0 ? (
            <div className="p-6 text-center">
              <BookOpen
                className="text-muted-foreground mx-auto mb-3 h-12 w-12"
                aria-hidden="true"
              />
              <p className="text-muted-foreground">No queued books yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Add a book to get started!
              </p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {queuedBooks.map((book) => (
                <li
                  key={book.id}
                  className="hover:bg-muted/50 p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground truncate font-medium">
                        {book.title}
                      </h3>
                      <p className="text-muted-foreground truncate text-sm">
                        {book.author}
                      </p>
                      <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
                        <span>{book.totalPages} pages</span>
                        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                          {book.status}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`/books/${book.id}`}
                      className="text-primary hover:bg-primary/10 flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium"
                    >
                      Start
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recent Sessions - Secondary */}
      <section className="border-border bg-card rounded-xl border">
        <div className="border-border border-b p-6">
          <h2 className="text-foreground text-xl font-semibold">
            Recent Sessions
          </h2>
        </div>
        <div className="divide-border divide-y">
          {recentSessions.length === 0 ? (
            <div className="p-6 text-center">
              <Clock
                className="text-muted-foreground mx-auto mb-3 h-12 w-12"
                aria-hidden="true"
              />
              <p className="text-muted-foreground">No reading sessions yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Log your first reading session to get started!
              </p>
            </div>
          ) : (
            <ul>
              {recentSessions.map((session) => (
                <li key={session.id} className="hover:bg-muted/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground font-medium">
                          Pages {session.startPage} → {session.endPage}
                        </span>
                        <span className="text-muted-foreground">
                          ({session.pagesRead} pages)
                        </span>
                        {session.mood && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {session.mood}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-1 text-sm">
                        <time dateTime={session.readAt.toISOString()}>
                          {session.readAt.toLocaleDateString()} at{" "}
                          {session.readAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-foreground text-lg font-semibold">
                        {session.pagesRead}
                      </div>
                      <div className="text-muted-foreground text-xs">pages</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
