"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadEpubPosition,
  saveEpubPosition,
  getEpubReadingState,
} from "./epub-position-actions";
import { completeEpubReading } from "./epub-reading-actions";
import { ReaderHeader, ReaderNavigation } from "./ReaderChrome";
import { DailyReadingCelebration } from "@/features/reading/ui/components/DailyReadingCelebration";
import type { DailyCelebration } from "@/features/reading/ui/celebration-types";
export function EpubReader({
  bookId,
  url,
  fileName,
  isReading = false,
  onClose,
}: {
  bookId: string;
  url: string;
  fileName: string;
  isReading?: boolean;
  onClose: () => void;
}) {
  const router = useRouter(),
    target = useRef<HTMLDivElement>(null),
    latest = useRef(Promise.resolve());
  const rendition = useRef<{
    next(): Promise<void>;
    prev(): Promise<void>;
    destroy(): void;
  } | null>(null);
  const [status, setStatus] = useState("Opening EPUB…"),
    [error, setError] = useState("");
  const [location, setLocation] = useState<{
      index: number;
      total: number;
      atEnd: boolean;
    } | null>(null),
    [baseline, setBaseline] = useState(0),
    [closing, setClosing] = useState(false),
    [end, setEnd] = useState(""),
    [finished, setFinished] = useState(false),
    [busy, setBusy] = useState(false),
    [celebration, setCelebration] = useState<DailyCelebration | null>(null);
  useEffect(() => {
    let stopped = false;
    let book: { destroy(): void } | null = null;
    async function open() {
      try {
        const [module, response, position, state] = await Promise.all([
          import("epubjs"),
          fetch(url, { signal: AbortSignal.timeout(30000) }),
          loadEpubPosition({ bookId }),
          getEpubReadingState({ bookId }),
        ]);
        if (!response.ok)
          throw new Error(
            "Could not download EPUB. Close and reopen to refresh access.",
          );
        const bytes = await response.arrayBuffer();
        if (stopped || !target.current) return;
        setBaseline(state?.confirmedLocation ?? 0);
        const epub = module.default(bytes);
        book = epub;
        await epub.ready;
        await epub.locations.generate(1024);
        if (stopped || !target.current) return;
        const view = epub.renderTo(target.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          allowScriptedContent: false,
        });
        rendition.current = view;
        view.on("relocated", (value) => {
          if (stopped || !value?.start?.cfi) return;
          const cfi = value.start.cfi,
            total = epub.locations.length(),
            ordinal = epub.locations.locationFromCfi(cfi);
          if (total < 1 || ordinal < 0) return;
          const index = value.atEnd ? total : Math.min(total, ordinal + 1);
          setLocation({ index, total, atEnd: !!value.atEnd });
          latest.current = latest.current
            .catch(() => undefined)
            .then(() =>
              saveEpubPosition({
                bookId,
                cfi,
                locationIndex: index,
                locationTotal: total,
                progressPercent: Math.min(
                  99,
                  Math.floor((index / total) * 100),
                ),
              }),
            )
            .then(() => {
              if (!stopped)
                setStatus(
                  "Viewing position saved · confirm reading when you finish",
                );
            })
            .catch(() => {
              if (!stopped)
                setError(
                  "Could not save position. Keep the reader open and try navigating again.",
                );
              throw new Error("Could not save position.");
            });
          // Handle rejection now while retaining it for the close/save path.
          void latest.current.catch(() => undefined);
        });
        await view.display(position ?? undefined);
      } catch (cause) {
        if (!stopped)
          setError(
            cause instanceof Error ? cause.message : "Unable to open EPUB",
          );
      }
    }
    void open();
    return () => {
      stopped = true;
      rendition.current?.destroy();
      rendition.current = null;
      book?.destroy();
    };
  }, [bookId, url]);
  async function closeWithoutLogging() {
    setBusy(true);
    setError("");
    try {
      await latest.current;
      router.refresh();
      onClose();
    } catch {
      setError("Could not save your bookmark. Try again before closing.");
    } finally {
      setBusy(false);
    }
  }
  function requestClose() {
    if (busy) return;
    if (!isReading || !location) {
      void closeWithoutLogging();
      return;
    }
    setEnd(
      String(
        Math.max(
          baseline,
          location.atEnd ? location.total : location.index - 1,
        ),
      ),
    );
    setFinished(false);
    setClosing(true);
    setError("");
  }
  async function confirm() {
    if (!location) return;
    const index = Number(end);
    if (
      !Number.isInteger(index) ||
      (index <= baseline &&
        !(finished && index === location.total && index === baseline)) ||
      index > location.index
    ) {
      setError(
        `Choose a completed location after ${baseline}, up to ${location.index}.`,
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await latest.current;
      const result = await completeEpubReading({
        bookId,
        locationIndex: index,
        finished,
      });
      setBaseline(Math.max(baseline, index));
      setClosing(false);
      if (result.celebration) setCelebration(result.celebration);
      else {
        router.refresh();
        onClose();
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save reading.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || closing || celebration)
        return;
      if (event.key === "Escape") requestClose();
      if (event.key === "ArrowRight") void rendition.current?.next();
      if (event.key === "ArrowLeft") void rendition.current?.prev();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Read ${fileName}`}
      className="bg-background fixed inset-0 z-50 flex flex-col"
    >
      <ReaderHeader
        title={fileName}
        status={status}
        busy={busy}
        onClose={requestClose}
      />
      {error && (
        <p role="alert" className="text-destructive px-4 py-2 text-sm">
          {error}
        </p>
      )}
      <div ref={target} className="min-h-0 flex-1 overflow-hidden" />
      <ReaderNavigation
        label={
          location
            ? `Location ${location.index} of ${location.total} · ${location.atEnd ? 100 : Math.min(99, Math.floor((location.index / location.total) * 100))}% viewed`
            : "Calculating locations…"
        }
        previous={() => void rendition.current?.prev()}
        next={() => void rendition.current?.next()}
        disablePrevious={!location || location.index <= 1 || busy}
        disableNext={!location || location.atEnd || busy}
      />
      {closing && location && (
        <div className="bg-background/95 fixed inset-0 z-[60] grid place-items-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Complete EPUB reading session"
            className="bg-card border-border w-full max-w-md space-y-4 rounded-xl border p-6"
          >
            <h2 className="font-semibold">Save your reading session</h2>
            <p className="text-muted-foreground text-sm">
              Previously confirmed: {baseline}. You reached location{" "}
              {location.index} of {location.total}. Moving through the reader
              alone does not log reading.
            </p>
            <label className="block space-y-2 text-sm">
              Last completed location
              <input
                type="number"
                min={baseline + 1}
                max={location.index}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="border-border bg-background min-h-11 w-full rounded-lg border px-3"
              />
            </label>
            {location.atEnd && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={finished}
                  onChange={(e) => setFinished(e.target.checked)}
                />
                I finished the book
              </label>
            )}
            <button
              disabled={busy}
              onClick={() => void confirm()}
              className="bg-primary text-primary-foreground min-h-11 w-full rounded-lg px-3 disabled:opacity-50"
            >
              Save reading and close
            </button>
            <button
              disabled={busy}
              onClick={() => void closeWithoutLogging()}
              className="border-border min-h-11 w-full rounded-lg border px-3"
            >
              Close without logging
            </button>
            <button
              disabled={busy}
              onClick={() => setClosing(false)}
              className="min-h-11 w-full underline"
            >
              Continue reading
            </button>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
      {celebration && (
        <DailyReadingCelebration
          celebration={celebration}
          onDismiss={() => {
            router.refresh();
            onClose();
          }}
        />
      )}
    </div>
  );
}
