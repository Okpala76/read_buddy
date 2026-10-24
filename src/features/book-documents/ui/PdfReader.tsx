"use client";

import { useEffect, useRef, useState } from "react";
import { updateBookProgress } from "@/features/books/ui/book-actions";

type PdfDocument = import("pdfjs-dist").PDFDocumentProxy;

export function PdfReader({
  bookId,
  url,
  fileName,
  initialCompletedPage,
  isReading,
  onClose,
}: {
  bookId: string;
  url: string;
  fileName: string;
  initialCompletedPage: number;
  isReading: boolean;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<PdfDocument | null>(null);
  const saveQueueRef = useRef(Promise.resolve());
  const latestSavedRef = useRef(initialCompletedPage);
  const [page, setPage] = useState(Math.max(1, initialCompletedPage + 1));
  const [pageCount, setPageCount] = useState(0);
  const [width, setWidth] = useState(800);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("Loading PDF…");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      setWidth(Math.max(240, container.clientWidth - 32));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof import("pdfjs-dist").getDocument> | null = null;
    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        if (cancelled) return;
        task = pdfjs.getDocument({ url, withCredentials: false });
        const document = await task.promise;
        if (cancelled) {
          await document.destroy();
          return;
        }
        documentRef.current = document;
        setPageCount(document.numPages);
        setPage((current) => Math.min(document.numPages, current));
        setSaveState(
          isReading ? "Progress saves automatically" : "Read-only progress",
        );
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Could not open PDF",
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
      void task?.destroy();
      documentRef.current = null;
    };
  }, [url, isReading]);

  useEffect(() => {
    const document = documentRef.current;
    const canvas = canvasRef.current;
    if (!document || !canvas || !pageCount) return;
    let cancelled = false;
    let renderTask: import("pdfjs-dist").RenderTask | null = null;
    async function render() {
      try {
        const pdfPage = await document.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const scale = width / base.width;
        const viewport = pdfPage.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        renderTask = pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await renderTask.promise;
      } catch (cause) {
        if (
          !cancelled &&
          !(
            cause instanceof Error &&
            cause.name === "RenderingCancelledException"
          )
        ) {
          setError(
            cause instanceof Error ? cause.message : "Page rendering failed",
          );
        }
      }
    }
    void render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [page, pageCount, width]);

  useEffect(() => {
    if (!isReading || !pageCount) return;
    // The page currently on screen is not yet completed. Persist the previous page.
    const completed = Math.min(pageCount - 1, page - 1);
    if (completed <= latestSavedRef.current) return;
    const timer = window.setTimeout(() => {
      setSaveState("Saving…");
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (completed <= latestSavedRef.current) return;
          try {
            await updateBookProgress({ bookId, page: completed });
            latestSavedRef.current = completed;
            setSaveState(`Saved through page ${completed}`);
          } catch (cause) {
            setSaveState(
              cause instanceof Error ? cause.message : "Save failed",
            );
          }
        });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [bookId, isReading, page, pageCount]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight")
        setPage((p) => Math.min(pageCount || p, p + 1));
      if (event.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pageCount]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Read ${fileName}`}
      className="bg-background fixed inset-0 z-50 flex flex-col"
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{fileName}</p>
          <p role="status" className="text-muted-foreground text-xs">
            {saveState}
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
      <div
        ref={containerRef}
        className="bg-muted/40 min-h-0 flex-1 overflow-auto p-4 text-center"
      >
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : (
          <canvas
            ref={canvasRef}
            aria-label={`PDF page ${page}`}
            className="mx-auto bg-white shadow"
          />
        )}
      </div>
      <footer className="flex items-center justify-center gap-3 border-t px-4 py-3">
        <button
          type="button"
          disabled={page <= 1 || !pageCount}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm" aria-live="polite">
          Page {page} of {pageCount || "…"}
        </span>
        <button
          type="button"
          disabled={!pageCount || page >= pageCount}
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </footer>
    </div>
  );
}
