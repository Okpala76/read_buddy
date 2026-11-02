"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recoveryPath, returnToApp } from "./offline-recovery";
export function OfflinePageContent() {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const checking = useRef(false),
    alive = useRef(true);
  const retry = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    setPending(true);
    setError("");
    setMessage("Checking your connection…");
    try {
      if (!navigator.onLine)
        throw new Error(
          "You’re still offline. Connect to Wi-Fi or mobile data, then try again.",
        );
      const nonce = crypto.randomUUID();
      const response = await fetch(`/api/connection?nonce=${nonce}`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok)
        throw new Error(
          "ReadOn is not reachable yet. Please try again shortly.",
        );
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        !("reachable" in data) ||
        data.reachable !== true ||
        !("nonce" in data) ||
        data.nonce !== nonce
      )
        throw new Error(
          "Could not confirm a connection to ReadOn. Please try again.",
        );
      if (!alive.current) return;
      setMessage("Connected. Returning to ReadOn…");
      let previous: string | null = null;
      try {
        previous = sessionStorage.getItem("readon:last-path");
      } catch {
        /* Storage may be unavailable in private mode. */
      }
      returnToApp(recoveryPath(window.location.pathname, previous));
    } catch (cause) {
      if (alive.current) {
        setError(
          cause instanceof Error && cause.name !== "TimeoutError"
            ? cause.message
            : "The connection check timed out. Please try again.",
        );
        setMessage("");
        setPending(false);
      }
      checking.current = false;
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const online = () => void retry();
    window.addEventListener("online", online);
    return () => {
      alive.current = false;
      window.removeEventListener("online", online);
    };
  }, [retry]);
  return (
    <main className="bg-background flex min-h-svh items-center justify-center px-5 py-12">
      <section
        aria-labelledby="offline-heading"
        className="border-border bg-card w-full max-w-lg rounded-3xl border p-7 text-center shadow-sm sm:p-10"
      >
        <div className="text-primary mb-8 flex items-center justify-center gap-2 text-sm font-semibold">
          <BookOpen className="size-5" aria-hidden="true" />
          ReadOn
        </div>
        <div className="bg-primary/10 text-primary mx-auto grid size-20 place-items-center rounded-full">
          <WifiOff className="size-8" aria-hidden="true" />
        </div>
        <h1
          id="offline-heading"
          className="text-card-foreground mt-6 text-3xl font-semibold tracking-tight"
        >
          You&apos;re offline
        </h1>
        <p className="text-muted-foreground mt-3 leading-7">
          A small pause in your reading journey. Reconnect to continue with
          ReadOn.
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          Changes cannot be saved while you are offline. Your previously saved
          progress stays in your account.
        </p>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={() => void retry()}
          className="mt-7 min-h-12 w-full rounded-xl sm:w-auto"
        >
          <RefreshCw
            className={
              pending
                ? "size-4 animate-spin motion-reduce:animate-none"
                : "size-4"
            }
            aria-hidden="true"
          />
          {pending ? "Checking connection…" : "Try again"}
        </Button>
        {message && (
          <p role="status" className="text-primary mt-4 text-sm">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {error}
          </p>
        )}
        <p className="text-muted-foreground mt-6 text-xs">
          We&apos;ll check again when your device reconnects.
        </p>
      </section>
    </main>
  );
}
