"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, PauseCircle, PlayCircle, UserPlus, X } from "lucide-react";
import type { FriendView } from "@/features/friends/ui/friend-actions";
import {
  inviteStreakBuddy,
  manageStreakPartnership,
  respondToStreakInvitation,
  type StreakPartnershipView,
} from "./streak-actions";

export function StreakPartnerships({
  friends,
  partnerships,
}: {
  friends: FriendView[];
  partnerships: StreakPartnershipView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const byFriendship = new Map(partnerships.map((p) => [p.friendshipId, p]));
  const available = friends.filter(
    (f) =>
      f.status === "ACCEPTED" &&
      (!byFriendship.has(f.requestId) ||
        byFriendship.get(f.requestId)?.status === "ENDED"),
  );
  const incoming = partnerships.filter(
    (p) => p.status === "PENDING" && p.direction === "incoming",
  );
  const outgoing = partnerships.filter(
    (p) => p.status === "PENDING" && p.direction === "outgoing",
  );
  const active = partnerships.filter((p) => p.status === "ACTIVE");
  const paused = partnerships.filter((p) => p.status === "PAUSED");

  function execute(action: () => Promise<unknown>, confirmation: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await action();
        setNotice(confirmation);
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
        );
      }
    });
  }

  return (
    <section className="border-border space-y-5 border-t pt-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Flame className="text-primary size-5" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Streak buddies</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Invite a reading friend to build a daily reading habit together. Each
          partnership is one-to-one. Once you both agree, you can encourage each
          other when one of you hasn&apos;t read that day. Daily nudges are
          available after your first reading session of the day.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="text-destructive border-destructive/40 bg-destructive/10 rounded-lg border p-3 text-sm"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="bg-primary/10 text-primary rounded-lg p-3 text-sm"
        >
          {notice}
        </p>
      )}

      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="space-y-3">
          <h3 className="font-semibold">Streak invitations</h3>
          {incoming.map((p) => (
            <article
              key={p.id}
              className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div>
                <p className="font-semibold">{p.partnerName}</p>
                <p className="text-muted-foreground text-sm">
                  Wants to start a one-to-one streak journey with you. Accept to
                  take part in future daily nudges.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={pending}
                  onClick={() =>
                    execute(
                      () =>
                        respondToStreakInvitation({
                          partnershipId: p.id,
                          decision: "ACTIVE",
                        }),
                      "Streak partnership accepted.",
                    )
                  }
                  className="bg-primary text-primary-foreground min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-50"
                >
                  Accept streak
                </button>
                <button
                  disabled={pending}
                  onClick={() =>
                    execute(
                      () =>
                        respondToStreakInvitation({
                          partnershipId: p.id,
                          decision: "DECLINED",
                        }),
                      "Streak invitation declined.",
                    )
                  }
                  className="border-border min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </article>
          ))}
          {outgoing.map((p) => (
            <article
              key={p.id}
              className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div>
                <p className="font-semibold">{p.partnerName}</p>
                <p className="text-muted-foreground text-sm">
                  Waiting for your friend to accept
                </p>
              </div>
              <button
                disabled={pending}
                onClick={() =>
                  execute(
                    () =>
                      manageStreakPartnership({
                        partnershipId: p.id,
                        action: "CANCEL",
                      }),
                    "Streak invitation canceled.",
                  )
                }
                className="border-border min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50"
              >
                Cancel invite
              </button>
            </article>
          ))}
        </div>
      )}

      {(active.length > 0 || paused.length > 0) && (
        <div className="space-y-3">
          <h3 className="font-semibold">
            Your streak journeys ({active.length} active)
          </h3>
          {[...active, ...paused].map((p) => (
            <article
              key={p.id}
              className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div>
                <p className="font-semibold">{p.partnerName}</p>
                <p className="text-muted-foreground text-sm">
                  {p.status === "ACTIVE"
                    ? "Active streak buddy · Daily encouragement enabled"
                    : p.pausedByYou
                      ? "You paused this streak journey"
                      : "Your buddy paused this streak journey"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.status === "ACTIVE" ? (
                  <button
                    disabled={pending}
                    onClick={() =>
                      execute(
                        () =>
                          manageStreakPartnership({
                            partnershipId: p.id,
                            action: "PAUSE",
                          }),
                        "Streak journey paused.",
                      )
                    }
                    className="border-border inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm disabled:opacity-50"
                  >
                    <PauseCircle className="size-4" />
                    Pause
                  </button>
                ) : p.canResume ? (
                  <button
                    disabled={pending}
                    onClick={() =>
                      execute(
                        () =>
                          manageStreakPartnership({
                            partnershipId: p.id,
                            action: "RESUME",
                          }),
                        "Streak journey resumed.",
                      )
                    }
                    className="border-border inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm disabled:opacity-50"
                  >
                    <PlayCircle className="size-4" />
                    Resume
                  </button>
                ) : null}
                <button
                  disabled={pending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `End your streak journey with ${p.partnerName}? A new invitation will be required to restart.`,
                      )
                    )
                      execute(
                        () =>
                          manageStreakPartnership({
                            partnershipId: p.id,
                            action: "END",
                          }),
                        "Streak journey ended.",
                      );
                  }}
                  className="text-muted-foreground border-border inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm disabled:opacity-50"
                >
                  <X className="size-4" />
                  End streak
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold">Invite a friend to streak together</h3>
        {available.length ? (
          <ul className="space-y-2">
            {available.map((f) => (
              <li
                key={f.requestId}
                className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <p className="font-medium">{f.name}</p>
                <button
                  disabled={pending}
                  onClick={() =>
                    execute(
                      () => inviteStreakBuddy({ friendshipId: f.requestId }),
                      "Streak invitation sent.",
                    )
                  }
                  className="border-border inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm font-medium disabled:opacity-50"
                >
                  <UserPlus className="size-4" />
                  Invite to streak
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground rounded-xl border p-4 text-sm">
            {partnerships.length
              ? "All available friends already have a streak journey or invitation."
              : "Add and connect with a reading friend above to invite them to streak together."}
          </p>
        )}
      </div>
    </section>
  );
}
