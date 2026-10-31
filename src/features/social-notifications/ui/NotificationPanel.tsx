"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { reactions, type Reaction } from "../domain/notification";
import {
  panelDestination,
  panelMessage,
  type PanelData,
  type PanelItem,
} from "../domain/panel";
import {
  changeNotification,
  getNotificationCenter,
} from "./notification-actions";
export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState("");
  const [limit, setLimit] = useState(50);
  const latest = useRef<string | null>(null);
  const request = useRef(0);
  const mounted = useRef(true);
  const invalidateRequest = useCallback(() => {
    request.current++;
  }, []);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    try {
      const result = await getNotificationCenter({ limit });
      if (!mounted.current || version !== request.current) return;
      const newest = result.items[0]?.createdAt ?? "";
      const incoming = result.items.find(
        (n) =>
          !n.read && latest.current !== null && n.createdAt > latest.current,
      );
      if (incoming) setAlert(panelMessage(incoming));
      latest.current =
        latest.current === null || newest > latest.current
          ? newest
          : latest.current;
      setData(result);
      setError(null);
    } catch {
      if (mounted.current && version === request.current)
        setError("Could not load notifications. Try again.");
    } finally {
      if (mounted.current && version === request.current) setLoading(false);
    }
  }, [limit]);
  useEffect(() => {
    mounted.current = true;
    const initial = setTimeout(() => void refresh(), 0);
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      mounted.current = false;
      invalidateRequest();
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh, invalidateRequest]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("notifications") === "open") {
      const timer = setTimeout(() => setOpen(true), 0);
      url.searchParams.delete("notifications");
      window.history.replaceState(null, "", url);
      return () => clearTimeout(timer);
    }
  }, []);
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(""), 6000);
    return () => clearTimeout(timer);
  }, [alert]);
  async function act(item: PanelItem, reaction?: Reaction) {
    setPending(true);
    setError(null);
    // Prevent an older poll response from restoring stale unread state.
    request.current++;
    try {
      await changeNotification({
        id: item.id,
        kind: item.kind,
        ...(reaction ? { reaction } : {}),
      });
      await refresh();
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
  return (
    <>
      {alert && (
        <div
          role="status"
          className="bg-card border-border fixed top-20 right-4 z-50 max-w-sm rounded-xl border p-4 shadow-lg"
        >
          <button
            className="text-primary text-left text-sm"
            onClick={() => {
              setOpen(true);
              setAlert("");
            }}
          >
            {alert}
          </button>
        </div>
      )}
      <Sheet
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) void refresh();
        }}
      >
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={`Notifications, ${data?.unreadCount ?? 0} unread`}
            className="motion-press hover:bg-accent relative inline-flex size-11 items-center justify-center rounded-full"
          >
            <Bell className="size-5" aria-hidden="true" />
            {!!data?.unreadCount && (
              <span
                aria-hidden="true"
                className="bg-primary text-primary-foreground absolute top-0 right-0 min-w-5 rounded-full px-1 text-center text-xs font-semibold"
              >
                {data.unreadCount > 99 ? "99+" : data.unreadCount}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex h-dvh w-full flex-col p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-border border-b p-5 pr-14 text-left">
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              Your reading reminders and encouragement, in one place.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                {data?.unreadCount ?? 0} unread
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => void refresh()}
              >
                <RefreshCw
                  className={
                    loading
                      ? "size-4 animate-spin motion-reduce:animate-none"
                      : "size-4"
                  }
                  aria-hidden="true"
                />
                Refresh
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            {!data && loading && (
              <p role="status" className="text-muted-foreground">
                Loading notifications…
              </p>
            )}
            {data?.items.length === 0 && (
              <p className="text-muted-foreground">
                You’re all caught up. Reading activity will appear here.
              </p>
            )}
            <ul className="space-y-3">
              {data?.items.map((item) => {
                const destination = panelDestination(item.kind);
                return (
                  <li
                    key={`${item.kind}:${item.id}`}
                    className="bg-card border-border space-y-3 rounded-xl border p-4"
                  >
                    <p
                      className={
                        item.read
                          ? "text-muted-foreground text-sm"
                          : "text-foreground text-sm font-semibold"
                      }
                    >
                      {panelMessage(item)}
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
                          size="sm"
                          disabled={pending}
                          onClick={() => void act(item)}
                        >
                          Mark as read
                        </Button>
                      )}
                      {destination && (
                        <Link
                          href={destination}
                          onClick={() => setOpen(false)}
                          className="text-primary inline-flex min-h-9 items-center px-2 text-sm underline"
                        >
                          {item.kind === "MILESTONE"
                            ? "Congratulate"
                            : item.kind === "READING_REMINDER"
                              ? "Read now"
                              : "Review invitation"}
                        </Link>
                      )}
                      {(item.kind === "NUDGE" ||
                        item.kind === "CONGRATULATION") && (
                        <div
                          role="group"
                          aria-label="React to encouragement"
                          className="flex gap-1"
                        >
                          {reactions.map((reaction) => (
                            <Button
                              key={reaction}
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              aria-label={`React ${reaction} to ${item.name || "your friend"}`}
                              aria-pressed={item.reaction === reaction}
                              onClick={() => void act(item, reaction)}
                            >
                              {reaction}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {data?.hasMore && limit < 500 && (
              <Button
                variant="outline"
                onClick={() =>
                  setLimit((previous) => Math.min(500, previous + 50))
                }
              >
                Load older notifications
              </Button>
            )}
            {data?.hasMore && limit === 500 && (
              <p className="text-muted-foreground text-xs">
                Showing the latest 500 notifications. The badge includes all
                unread activity.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
