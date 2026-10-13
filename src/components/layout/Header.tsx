"use client";

import { UserButton } from "@clerk/nextjs";
import { BookOpen, Flame, Menu } from "lucide-react";
import Link from "next/link";

import { SheetTrigger } from "@/components/ui/sheet";

export function Header({ currentStreak }: { currentStreak: number }) {
  const streakLabel = `${currentStreak} ${currentStreak === 1 ? "day" : "days"}`;

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 h-16 w-full border-b backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <SheetTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-md lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="size-6" aria-hidden="true" />
            </button>
          </SheetTrigger>

          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 lg:hidden"
          >
            <BookOpen
              className="text-primary size-6 shrink-0"
              aria-hidden="true"
            />
            <span className="text-foreground hidden truncate font-semibold sm:block">
              Reading Buddy
            </span>
          </Link>

          <Link
            href="/analytics"
            aria-label={`Current reading streak: ${streakLabel}. View progress.`}
            className="motion-press border-streak/25 bg-streak/10 text-streak-foreground hover:bg-streak/15 inline-flex min-h-11 items-center gap-2.5 rounded-full border px-2.5 pr-3.5 transition-colors lg:px-3 lg:pr-4"
          >
            <span className="bg-streak text-primary-foreground grid size-7 shrink-0 place-items-center rounded-full shadow-sm">
              <Flame className="size-4" aria-hidden="true" />
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-streak hidden text-[11px] font-semibold tracking-wide uppercase sm:inline">
                Streak
              </span>
              <span className="text-sm font-semibold">{streakLabel}</span>
            </span>
          </Link>
        </div>

        <UserButton />
      </div>
    </header>
  );
}
