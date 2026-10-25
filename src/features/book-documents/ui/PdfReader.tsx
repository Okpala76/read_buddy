"use client";

import { useEffect, useRef, useState } from "react";
import {
  alignPdfReading,
  completePdfReading,
  getPdfReadingState,
  savePdfViewedPage,
} from "./pdf-reading-actions";

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
  const [aligned, setAligned] = useState(false);
  const [confirmedPage, setConfirmedPage] = useState(0);
  const [physicalPage, setPhysicalPage] = useState(initialCompletedPage);
  const [baseline, setBaseline] = useState("0");
  const [showClose, setShowClose] = useState(false);
  const [endPageInput, setEndPageInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
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
        const progress = await getPdfReadingState({ bookId });
        if (cancelled) return;
        setPageCount(document.numPages);
        setPhysicalPage(progress.physicalPage);
        if (progress.state) {
          setAligned(true);
          setConfirmedPage(progress.state.confirmedPage);
          setPage(
            Math.max(1, Math.min(document.numPages, progress.state.viewedPage)),
          );
          setSaveState(
            "Viewing position saved separately from reading sessions",
          );
        } else {
          setPage(1);
          setSaveState(
            "Match this PDF with your existing physical-book progress",
          );
        }
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
  }, [url, isReading, bookId]);

  useEffect(() => {
    const document = documentRef.current;
    const canvas = canvasRef.current;
    if (!document || !canvas || !pageCount) return;
    let cancelled = false;
    let renderTask: import("pdfjs-dist").RenderTask | null = null;
    async function render() {
      if (!document || !canvas) return;
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

  async function align() {
    const value = Number(baseline);
    if (!Number.isInteger(value) || value < 0 || value >= pageCount) {
      setError(`Choose a completed PDF page between 0 and ${pageCount - 1}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await alignPdfReading({ bookId, pageCount, confirmedPage: value });
      setConfirmedPage(value);
      setAligned(true);
      setPage(value + 1);
      setSaveState("Aligned. Old physical reading history is unchanged.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Alignment failed");
    } finally {
      setBusy(false);
    }
  }

  function requestClose() {
    if (!aligned || !isReading) {
      void closeWithoutLogging();
      return;
    }
    setEndPageInput(String(Math.max(confirmedPage, page - 1)));
    setShowClose(true);
    setError("");
  }

  async function closeWithoutLogging() {
    if (busy) return;
    setBusy(true);
    try {
      if (aligned) await savePdfViewedPage({ bookId, viewedPage: page });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save the viewing position",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmAndClose() {
    if (busy) return;
    const endPage = Number(endPageInput);
    if (
      !Number.isInteger(endPage) ||
      endPage <= confirmedPage ||
      endPage > pageCount
    ) {
      setError(
        `Choose the last page you finished, after ${confirmedPage} and up to ${pageCount}`,
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await completePdfReading({
        bookId,
        endPage,
        viewedPage: page,
      });
      setFeedback(
        `${saved.pagesRead} PDF pages recorded toward your reading streak`,
      );
      setConfirmedPage(saved.completedPage);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Reading could not be saved",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight")
        setPage((p) => Math.min(pageCount || p, p + 1));
      if (event.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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
          onClick={requestClose}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Finish / Close
        </button>
      </header>
      {!aligned && pageCount > 0 && (
        <section
          className="bg-muted/40 space-y-3 border-b p-4"
          aria-label="Align PDF with physical reading"
        >
          <h2 className="font-semibold">Match your PDF reading position</h2>
          <p className="text-sm">
            Your physical book was last recorded at page {physicalPage}. This
            PDF has {pageCount} pages. Page numbers may differ between editions.
          </p>
          <label className="block text-sm" htmlFor="pdf-alignment-page">
            Last completed page in this PDF (0 if starting here)
          </label>
          <input
            id="pdf-alignment-page"
            className="w-32 rounded-lg border p-2"
            type="number"
            min={0}
            max={pageCount - 1}
            value={baseline}
            onChange={(event) => setBaseline(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Check the corresponding text in the PDF. This alignment does not add
            reading activity or change your past sessions.
          </p>
          <button
            type="button"
            disabled={busy}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 disabled:opacity-50"
            onClick={() => void align()}
          >
            Save PDF starting position
          </button>
        </section>
      )}
      {feedback && <p role="status">{feedback}</p>}
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
      {showClose && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Complete PDF reading session"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <section className="bg-background w-full max-w-md space-y-4 rounded-xl p-6">
            <h2 className="text-lg font-semibold">
              Finish today&apos;s reading?
            </h2>
            <p className="text-muted-foreground text-sm">
              Your last confirmed PDF page was {confirmedPage}. You&apos;re
              viewing page {page}. What page did you actually finish reading?
            </p>
            <label className="block text-sm font-medium" htmlFor="pdf-end-page">
              Last completed PDF page
            </label>
            <input
              id="pdf-end-page"
              type="number"
              min={confirmedPage + 1}
              max={pageCount}
              value={endPageInput}
              onChange={(event) => setEndPageInput(event.target.value)}
              className="w-full rounded-lg border p-3"
            />
            <p className="text-sm">
              Pages read:{" "}
              {Math.max(0, Number(endPageInput) - confirmedPage) || 0}
            </p>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmAndClose()}
              className="bg-primary text-primary-foreground w-full rounded-lg p-3 disabled:opacity-50"
            >
              Save reading and close
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void closeWithoutLogging()}
              className="w-full rounded-lg border p-3 disabled:opacity-50"
            >
              Close without logging
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowClose(false)}
              className="w-full p-2 text-sm underline"
            >
              Continue reading
            </button>
          </section>
        </div>
      )}
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
