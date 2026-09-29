"use client";

import { ReadingMood } from "@/features/reading/domain";
import { cn } from "@/lib/utils";

const moodLabels: Record<ReadingMood, string> = {
  FOCUSED: "Focused",
  RELAXED: "Relaxed",
  ENERGIZED: "Energized",
  DISTRACTED: "Distracted",
  TIRED: "Tired",
};

const moodColors: Record<ReadingMood, string> = {
  FOCUSED: "bg-blue/10 text-blue border-blue/20",
  RELAXED: "bg-green/10 text-green border-green/20",
  ENERGIZED: "bg-yellow/10 text-yellow border-yellow/20",
  DISTRACTED: "bg-orange/10 text-orange border-orange/20",
  TIRED: "bg-purple/10 text-purple border-purple/20",
};

export interface SessionData {
  id: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  mood: ReadingMood | null;
  readAt: Date;
}

interface SessionItemProps {
  session: SessionData;
}

export function SessionItem({ session }: SessionItemProps) {
  return (
    <article className="border-border hover:bg-muted/50 rounded-lg border p-4 transition-colors">
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
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  moodColors[session.mood],
                )}
              >
                {moodLabels[session.mood]}
              </span>
            )}
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
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
    </article>
  );
}

interface SessionListProps {
  sessions: SessionData[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function SessionList({
  sessions,
  isLoading,
  onLoadMore,
  hasMore,
}: SessionListProps) {
  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div
          className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="py-12 text-center">
        <div
          className="text-muted-foreground mx-auto mb-3 size-12"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-12"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.017 8.017 0 0112 14c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8c0 1.73-.617 3.32-1.613 4.488"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 14a6.008 6.008 0 01-3.42-5.456"
            />
          </svg>
        </div>
        <p className="text-muted-foreground">No reading sessions yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Log your first reading session to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          className="border-border bg-background text-foreground hover:bg-muted mt-4 w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Load more sessions
        </button>
      )}
    </div>
  );
}
