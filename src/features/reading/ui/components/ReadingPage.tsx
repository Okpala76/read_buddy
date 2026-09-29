"use client";

import { useEffect, useState } from "react";
import { Book, BookStatus } from "@/features/books/domain";
import {
  getCurrentReading,
  getDailyTarget,
  getRecentReadingSessions,
} from "@/features/reading/ui/reading-actions";
import { LogReadingForm } from "./LogReadingForm";
import { SessionList, type SessionData } from "./SessionList";
import { Loader2, Target, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReadingPage() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [dailyTarget, setDailyTarget] = useState<number>(10);
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [book, target, sessions] = await Promise.all([
        getCurrentReading(),
        getDailyTarget(),
        getRecentReadingSessions(10),
      ]);
      setCurrentBook(book);
      setDailyTarget(target);
      setRecentSessions(sessions as SessionData[]);
    } catch (err) {
      setError("Failed to load reading data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [book, target, sessions] = await Promise.all([
          getCurrentReading(),
          getDailyTarget(),
          getRecentReadingSessions(10),
        ]);
        if (mounted) {
          setCurrentBook(book);
          setDailyTarget(target);
          setRecentSessions(sessions as SessionData[]);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load reading data");
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

  const handleLogSuccess = () => {
    fetchData();
  };

  const progressPercent = currentBook
    ? Math.round((currentBook.currentPage / currentBook.totalPages) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2
          className="text-primary size-8 animate-spin"
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
    <div className="space-y-8">
      {/* Current Reading Book */}
      {currentBook && (
        <section
          className={cn(
            "border-border bg-card rounded-xl border p-6",
            currentBook.status === BookStatus.READING &&
              "ring-primary/50 ring-2",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
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

        <LogReadingForm
          currentBook={currentBook}
          dailyTarget={dailyTarget}
          onSuccess={handleLogSuccess}
        />
      </section>

      {/* Recent Sessions */}
      <section>
        <h2 className="text-foreground mb-4 text-xl font-semibold">
          Recent Sessions
        </h2>
        <SessionList sessions={recentSessions} />
      </section>
    </div>
  );
}
