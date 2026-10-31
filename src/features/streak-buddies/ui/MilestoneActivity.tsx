"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { congratulateMilestone } from "./milestone-actions";

type Activity = {
  friends: { id: string; days: number; name: string | null; sent: boolean }[];
  received: { id: string; days: number; name: string | null }[];
};

export function MilestoneActivity({ activity }: { activity: Activity }) {
  const [sent, setSent] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function congratulate(id: string) {
    setPending(id);
    setError(null);
    try {
      await congratulateMilestone({ milestoneId: id });
      setSent((previous) => [...previous, id]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not send congratulations. Try again.",
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <section aria-label="Reading milestones" className="space-y-4">
      <h2 className="text-xl font-semibold">Reading milestones</h2>
      <p className="text-muted-foreground text-sm">
        Celebrate your friends reaching 10, 50, or 100 consecutive reading days.
      </p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {activity.friends.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Your friends’ milestones will appear here.
        </p>
      )}
      <ul className="space-y-2">
        {activity.friends.map((m) => {
          const done = m.sent || sent.includes(m.id);
          return (
            <li
              key={m.id}
              className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <p>
                {m.name?.trim() || "Your friend"} reached a {m.days}-day reading
                streak.
              </p>
              <Button
                disabled={pending !== null || done}
                onClick={() => congratulate(m.id)}
                aria-label={`${done ? "Congratulated" : "Congratulate"} ${m.name?.trim() || "your friend"} on ${m.days} days`}
              >
                {done
                  ? "Congratulations sent"
                  : pending === m.id
                    ? "Sending…"
                    : "Congratulate"}
              </Button>
              {done && (
                <p
                  role="status"
                  className="text-muted-foreground w-full text-sm"
                >
                  Your encouragement is on its way to your friend.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {activity.received.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Congratulations from your friends</h3>
          <ul className="space-y-2">
            {activity.received.map((m) => (
              <li
                key={m.id}
                className="border-border bg-card rounded-xl border p-4 text-sm"
              >
                {m.name?.trim() || "Your friend"} says: Congratulations on{" "}
                {m.days} consecutive reading days. Keep going!
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
