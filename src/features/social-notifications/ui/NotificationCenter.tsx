"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  notificationMessage,
  reactions,
  type NotificationView,
  type Reaction,
} from "../domain/notification";
import {
  changeNotification,
  saveSocialPreferences,
} from "./notification-actions";

export function NotificationCenter({
  notifications,
  settings,
  invitations,
}: {
  notifications: NotificationView[];
  settings: { receiveNudges: boolean; shareMilestones: boolean };
  invitations: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [preferences, setPreferences] = useState(settings);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  async function update(item: NotificationView, reaction?: Reaction) {
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await changeNotification({
        id: item.id,
        kind: item.kind,
        ...(reaction ? { reaction } : {}),
      });
      setItems((previous) =>
        previous.map((n) =>
          n.id === item.id && n.kind === item.kind
            ? { ...n, read: true, reaction: reaction ?? n.reaction }
            : n,
        ),
      );
      setStatus(reaction ? "Reaction sent." : "Marked as read.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update notification.",
      );
    } finally {
      setPending(false);
    }
  }
  async function save() {
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      await saveSocialPreferences(preferences);
      setStatus("Privacy settings saved.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save settings.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-foreground text-3xl font-semibold">
          Notifications
        </h1>
        <p className="text-muted-foreground">
          Encouragement from your reading friends, in one place.
        </p>
      </header>
      {invitations > 0 && (
        <p className="border-border rounded-xl border p-4">
          You have {invitations} pending{" "}
          {invitations === 1 ? "invitation" : "invitations"}.{" "}
          <Link href="/friends" className="text-primary underline">
            Review on Friends
          </Link>
        </p>
      )}
      <p>
        <Link href="/friends" className="text-primary underline">
          View friends and congratulate their milestones
        </Link>
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="text-primary">
          {status}
        </p>
      )}
      <section aria-label="Reading encouragement" className="space-y-4">
        <h2 className="text-xl font-semibold">
          Encouragement · {items.filter((n) => !n.read).length} unread
        </h2>
        {items.length === 0 ? (
          <p className="text-muted-foreground">
            No encouragement yet. Your nudges and congratulations will appear
            here.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={`${item.kind}:${item.id}`}
                className="border-border bg-card space-y-3 rounded-xl border p-4"
              >
                <p
                  className={
                    item.read
                      ? "text-muted-foreground"
                      : "text-foreground font-semibold"
                  }
                >
                  {notificationMessage(item)}
                </p>
                <time
                  dateTime={item.createdAt}
                  className="text-muted-foreground text-xs"
                >
                  {new Date(item.createdAt).toLocaleString("en-GB", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
                <div className="flex flex-wrap gap-2">
                  {!item.read && (
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => update(item)}
                    >
                      Mark as read
                    </Button>
                  )}
                  {!item.kind.endsWith("_REACTION") && (
                    <div
                      role="group"
                      aria-label="React to encouragement"
                      className="flex gap-2"
                    >
                      {reactions.map((reaction) => (
                        <Button
                          key={reaction}
                          variant="outline"
                          disabled={pending}
                          aria-label={`React ${reaction} to ${item.name?.trim() || "your friend"}`}
                          aria-pressed={item.reaction === reaction}
                          onClick={() => update(item, reaction)}
                        >
                          {reaction}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section
        aria-label="Reading privacy"
        className="border-border space-y-4 rounded-xl border p-5"
      >
        <h2 className="text-xl font-semibold">Reading privacy</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.receiveNudges}
            disabled={pending}
            onChange={(e) =>
              setPreferences((p) => ({ ...p, receiveNudges: e.target.checked }))
            }
          />
          Receive daily nudges from streak buddies
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.shareMilestones}
            disabled={pending}
            onChange={(e) =>
              setPreferences((p) => ({
                ...p,
                shareMilestones: e.target.checked,
              }))
            }
          />
          Share streak milestones with accepted friends
        </label>
        <p className="text-muted-foreground text-sm">
          Turning off sharing hides milestone prompts and stops new
          congratulations. Previously delivered messages remain in their
          recipient’s history. Book titles and pages are never included.
        </p>
        <Button disabled={pending} onClick={save}>
          Save privacy settings
        </Button>
      </section>
    </div>
  );
}
