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

  async function upload(file: File) {
    if (
      !(
        file.type === "application/pdf" ||
        file.type === "application/epub+zip"
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
      window.open(document.url, "_blank", "noopener,noreferrer");
      setHasDocument(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Document not found");
    } finally {
      setBusy(false);
    }
  }

  return (
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
  );
}
