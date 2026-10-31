"use client";

import { useState } from "react";
import { BookOpen, Flame, PartyPopper, X } from "lucide-react";
import { nudgeMyBuddies } from "@/features/streak-buddies/ui/nudge-actions";
import type { DailyCelebration } from "@/features/reading/ui/celebration-types";

export function DailyReadingCelebration({
  celebration,
  onDismiss,
}: {
  celebration: DailyCelebration;
  onDismiss: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  async function sendNudges() {
    setSending(true);
    setError(null);
    try {
      const response = await nudgeMyBuddies();
      setResult(response.alreadySent ? "You already used today’s nudge." : response.sent > 0 ? `Encouraged ${response.sent} ${response.sent === 1 ? "buddy" : "buddies"} today!` : "All your buddies have already read, received a nudge, or are not active.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send nudges. Try again.");
    } finally {
      setSending(false);
    }
  }
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
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          {result && <p role="status" className="text-primary text-sm">{result}</p>}
          <button
            type="button"
            disabled={sending || result !== null}
            onClick={sendNudges}
            className="bg-primary text-primary-foreground min-h-12 w-full rounded-xl px-4 font-semibold disabled:opacity-55"
          >
            {sending ? "Sending…" : "Nudge my buddies"}
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
          Only active buddies who have not read or received a nudge today will be notified. Your reading is saved.
        </p>
      </section>
    </div>
  );
}
