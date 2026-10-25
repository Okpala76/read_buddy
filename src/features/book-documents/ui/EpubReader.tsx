"use client";

import { useEffect, useRef, useState } from "react";

import { loadEpubPosition, saveEpubPosition } from "./epub-position-actions";

export function EpubReader({
  bookId,
  url,
  fileName,
  onClose,
}: {
  bookId: string;
  url: string;
  fileName: string;
  onClose: () => void;
}) {
  const target = useRef<HTMLDivElement>(null);
  const rendition = useRef<{
    next(): Promise<void>;
    prev(): Promise<void>;
    destroy(): void;
  } | null>(null);
  const [status, setStatus] = useState("Opening EPUB…");
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    let book: { destroy(): void } | null = null;
    async function open() {
      try {
        const [module, response, position] = await Promise.all([
          import("epubjs"),
          fetch(url),
          loadEpubPosition({ bookId }),
        ]);
        if (!response.ok)
          throw new Error("Could not download EPUB from storage");
        const bytes = await response.arrayBuffer();
        if (stopped || !target.current) return;
        const epub = module.default(bytes);
        book = epub;
        await epub.ready;
        if (stopped || !target.current) return;
        const view = epub.renderTo(target.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
        });
        rendition.current = view;
        let firstLocation = true;
        let latest = Promise.resolve();
        view.on("relocated", (location) => {
          if (stopped || !location?.start?.cfi) return;
          if (firstLocation) {
            firstLocation = false;
            setStatus("Reading position restored");
            return;
          }
          const cfi = location.start.cfi;
          latest = latest
            .catch(() => undefined)
            .then(() => saveEpubPosition({ bookId, cfi }))
            .then(() => setStatus("Position saved"))
            .catch(() => setStatus("Could not save position"));
        });
        await view.display(position ?? undefined);
        if (!stopped) setStatus(position ? "Resumed reading" : "Ready to read");
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Read ${fileName}`}
      className="bg-background fixed inset-0 z-50 flex flex-col"
    >
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{fileName}</p>
          <p role="status" className="text-muted-foreground text-xs">
            {status}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Close reader
        </button>
      </header>
      {error && (
        <p role="alert" className="text-destructive p-4">
          {error}
        </p>
      )}
      <div ref={target} className="min-h-0 flex-1 overflow-hidden" />
      <footer className="flex justify-center gap-3 border-t p-3">
        <button
          type="button"
          onClick={() => void rendition.current?.prev()}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => void rendition.current?.next()}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Next
        </button>
      </footer>
    </div>
  );
}
