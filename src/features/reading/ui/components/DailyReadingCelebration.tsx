"use client";

import { BookOpen, Flame, PartyPopper, X } from "lucide-react";
import type { DailyCelebration } from "@/features/reading/ui/celebration-types";

export function DailyReadingCelebration({
  celebration,
  onDismiss,
}: {
  celebration: DailyCelebration;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Daily reading celebration"
        className="bg-background border-border relative w-full max-w-md space-y-5 rounded-2xl border p-6 text-center shadow-xl sm:p-8"
      >
        <button
          type="button"
          aria-label="Dismiss celebration"
          onClick={onDismiss}
          className="text-muted-foreground hover:bg-muted absolute top-4 right-4 rounded-lg p-2"
        >
          <X className="size-5" />
        </button>
        <div className="bg-primary/10 text-primary mx-auto grid size-16 place-items-center rounded-full">
          <PartyPopper className="size-8" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-foreground text-2xl font-bold">Great job! 🎉</h2>
          <p className="text-muted-foreground">
            You finished today&apos;s first reading session.
          </p>
        </div>
        <div className="bg-muted/50 space-y-3 rounded-xl p-5">
          <p className="text-foreground font-semibold">
            <BookOpen
              className="text-primary mr-2 inline size-4"
              aria-hidden="true"
            />
            {celebration.pagesRead}{" "}
            {celebration.pagesRead === 1 ? "page" : "pages"} of{" "}
            {celebration.bookTitle}
          </p>
          <p className="text-primary flex items-center justify-center gap-2 font-semibold">
            <Flame className="size-5" aria-hidden="true" />
            {celebration.streakDays}-day reading streak
          </p>
          <p className="text-muted-foreground text-xs">
            {celebration.source === "PDF"
              ? "Read in PDF"
              : "Physical reading log"}
          </p>
        </div>
        <p className="text-foreground text-sm">
          One more day of showing up for your reading habit. Want to encourage
          your streak buddies to read today too?
        </p>
        <div className="space-y-3">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="bg-primary text-primary-foreground min-h-12 w-full rounded-xl px-4 font-semibold opacity-55"
          >
            Nudge my buddies · Available in Batch 4/6
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="border-border min-h-12 w-full rounded-xl border px-4 font-semibold"
          >
            Maybe later
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          Daily nudges are not active yet. Your reading is saved.
        </p>
      </section>
    </div>
  );
}
