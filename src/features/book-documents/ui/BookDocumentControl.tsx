"use client";

import { useState } from "react";

import {
  beginDocumentUpload,
  completeDocumentUpload,
  getDocumentDownload,
} from "./document-actions";

const MAX_SIZE = 50 * 1024 * 1024;

export function BookDocumentControl({ bookId }: { bookId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hasDocument, setHasDocument] = useState(false);
  const [reader, setReader] = useState<{
    url: string;
    fileName: string;
    contentType: string;
  } | null>(null);
  const [page, setPage] = useState(1);

  async function upload(file: File) {
    if (
      !(
        file.type === "application/pdf" || file.type === "application/epub+zip"
      ) ||
      file.size === 0 ||
      file.size > MAX_SIZE
    ) {
      setMessage("Choose a PDF or EPUB file smaller than 50 MB.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { uploadUrl, headers, uploadToken } = await beginDocumentUpload({
        bookId,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      const result = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: file,
      });
      if (!result.ok) throw new Error("File transfer to storage failed");
      await completeDocumentUpload({ uploadToken });
      setHasDocument(true);
      setMessage("Document attached to your book.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function openDocument() {
    setBusy(true);
    setMessage("");
    try {
      const document = await getDocumentDownload({ bookId });
      if (document.contentType === "application/pdf") {
        setPage(1);
        setReader({
          url: document.url,
          fileName: document.fileName,
          contentType: document.contentType,
        });
      } else {
        window.open(document.url, "_blank", "noopener,noreferrer");
      }
      setHasDocument(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Document not found");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="border-border hover:bg-muted inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-xs font-medium">
          {busy ? "Working…" : "Attach PDF / EPUB"}
          <input
            type="file"
            accept=".pdf,.epub,application/pdf,application/epub+zip"
            className="sr-only"
            disabled={busy || hasDocument}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void openDocument()}
          className="text-primary text-xs font-medium underline disabled:opacity-50"
        >
          Open attached document
        </button>
        {message && (
          <p role="status" className="text-muted-foreground w-full text-xs">
            {message}
          </p>
        )}
      </div>
      {reader && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Read ${reader.fileName}`}
          className="bg-background fixed inset-0 z-50 flex flex-col"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {reader.fileName}
              </p>
              <p className="text-muted-foreground text-xs">
                PDF reader · Use the page controls below or the PDF toolbar
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReader(null)}
              className="rounded-lg border px-3 py-2 text-sm font-medium"
            >
              Close reader
            </button>
          </header>
          <iframe
            key={`${reader.url}#page=${page}`}
            src={`${reader.url}#page=${page}`}
            title={reader.fileName}
            className="min-h-0 w-full flex-1"
          />
          <footer className="flex items-center justify-center gap-3 border-t px-4 py-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <label className="flex items-center gap-2 text-sm">
              Page
              <input
                aria-label="PDF page"
                type="number"
                min={1}
                value={page}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isInteger(next) && next >= 1) setPage(next);
                }}
                className="bg-background w-20 rounded-lg border px-2 py-2"
              />
            </label>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Next
            </button>
          </footer>
        </div>
      )}
    </>
  );
}
