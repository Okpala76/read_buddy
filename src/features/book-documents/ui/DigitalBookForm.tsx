"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  beginDigitalBook,
  inspectDigitalBook,
  completeDigitalBook,
  cancelDigitalBook,
} from "./digital-book-actions";
export function DigitalBookForm({
  format,
  hasCurrentReading,
  onSaved,
  onBusyChange,
}: {
  format: "PDF" | "EPUB";
  hasCurrentReading: boolean;
  onSaved: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const generation = useRef(0);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [startNow, setStartNow] = useState(!hasCurrentReading);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (uploadId) void cancelDigitalBook({ uploadId }).catch(() => undefined);
    },
    [uploadId],
  );
  function working(value: boolean) {
    setBusy(value);
    onBusyChange?.(value);
  }
  async function upload(file: File) {
    const version = ++generation.current;
    setError(null);
    setUploadId(null);
    working(true);
    setStage("Uploading your book…");
    try {
      const contentType =
        format === "PDF" ? "application/pdf" : "application/epub+zip";
      if (
        !file.name
          .toLowerCase()
          .endsWith(format === "PDF" ? ".pdf" : ".epub") ||
        file.size === 0 ||
        file.size > 50 * 1024 * 1024
      )
        throw new Error(`Choose a ${format} file up to 50 MB.`);
      const result = await beginDigitalBook({
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
      });
      const response = await fetch(result.url, {
        method: "PUT",
        headers: result.headers,
        body: file,
      });
      if (!response.ok)
        throw new Error("The upload failed. Select the file to try again.");
      setStage("Reading book details…");
      const metadata = await inspectDigitalBook({ uploadId: result.uploadId });
      if (version !== generation.current) return;
      setTitle(metadata.title);
      setAuthor(metadata.author);
      setPageCount(metadata.pageCount);
      setUploadId(result.uploadId);
      setStage("Ready to review");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not upload this book.",
      );
      setStage("");
    } finally {
      if (version === generation.current) working(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!uploadId) return;
    working(true);
    setError(null);
    setStage("Saving your book…");
    try {
      await completeDigitalBook({
        uploadId,
        title,
        author,
        startNow: startNow && !hasCurrentReading,
      });
      router.refresh();
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save your book. Try again.",
      );
    } finally {
      working(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Upload your {format}, review its details, and add it directly to your
        library.
      </p>
      <label className="border-border bg-muted/30 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 text-sm">
        <Upload className="size-5" aria-hidden="true" />
        <span>
          Choose {format} file
          <input
            className="mt-2 block w-full text-sm"
            type="file"
            accept={
              format === "PDF"
                ? ".pdf,application/pdf"
                : ".epub,application/epub+zip"
            }
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </span>
      </label>
      {stage && (
        <p
          role="status"
          className="text-muted-foreground flex items-center gap-2 text-sm"
        >
          {busy && (
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {stage}
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {uploadId && (
        <>
          <label className="block space-y-1 text-sm">
            <span>Book title</span>
            <input
              required
              maxLength={500}
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              className="border-border bg-background min-h-11 w-full rounded-lg border px-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Author (optional)</span>
            <input
              maxLength={500}
              value={author}
              disabled={busy}
              onChange={(e) => setAuthor(e.target.value)}
              className="border-border bg-background min-h-11 w-full rounded-lg border px-3"
            />
          </label>
          <p className="text-muted-foreground text-sm">
            {format === "PDF"
              ? `${pageCount} PDF pages detected. Start reading from the beginning.`
              : "EPUB progress uses reading locations, so no paper page count is needed."}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={busy || hasCurrentReading}
              checked={startNow && !hasCurrentReading}
              onChange={(e) => setStartNow(e.target.checked)}
            />
            Start reading now
          </label>
          {hasCurrentReading && (
            <p className="text-muted-foreground text-xs">
              This book will join your queue while another book is active.
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || !title.trim()}
            className="w-full"
          >
            {busy ? "Saving…" : "Add to library"}
          </Button>
        </>
      )}
    </form>
  );
}
