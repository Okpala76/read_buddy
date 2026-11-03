"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PdfReader } from "./PdfReader";
import { EpubReader } from "./EpubReader";

import {
  beginDocumentUpload,
  completeDocumentUpload,
  getDocumentDownload,
} from "./document-actions";

const MAX_SIZE = 50 * 1024 * 1024;

export function BookDocumentControl({
  bookId,
  documentFormat,
  currentPage = 0,
  isReading = false,
}: {
  bookId: string;
  documentFormat?: "PDF" | "EPUB";
  currentPage?: number;
  isReading?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [attachedFormat, setAttachedFormat] = useState(documentFormat);
  const format = attachedFormat;
  const [reader, setReader] = useState<{
    url: string;
    fileName: string;
    contentType: string;
  } | null>(null);

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
      setAttachedFormat(file.type === "application/pdf" ? "PDF" : "EPUB");
      router.refresh();
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
      if (!document) {
        setAttachedFormat(undefined);
        setMessage(
          "No digital book attached yet. Attach a PDF or EPUB to start reading.",
        );
        router.refresh();
        return;
      }
      setReader({
        url: document.url,
        fileName: document.fileName,
        contentType: document.contentType,
      });
      setAttachedFormat(
        document.contentType === "application/pdf" ? "PDF" : "EPUB",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Document not found");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!format && (
          <label className="border-border hover:bg-muted inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-xs font-medium">
            {busy ? "Working…" : "Attach PDF / EPUB"}
            <input
              type="file"
              accept=".pdf,.epub,application/pdf,application/epub+zip"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </label>
        )}
        {format && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void openDocument()}
            className="text-primary text-xs font-medium underline disabled:opacity-50"
          >
            Open {format}
          </button>
        )}
        {message && (
          <p role="status" className="text-muted-foreground w-full text-xs">
            {message}
          </p>
        )}
      </div>
      {reader?.contentType === "application/epub+zip" && (
        <EpubReader
          bookId={bookId}
          isReading={isReading}
          url={reader.url}
          fileName={reader.fileName}
          onClose={() => setReader(null)}
        />
      )}
      {reader?.contentType === "application/pdf" && (
        <PdfReader
          bookId={bookId}
          url={reader.url}
          fileName={reader.fileName}
          initialCompletedPage={currentPage}
          isReading={isReading}
          onClose={() => setReader(null)}
        />
      )}
    </>
  );
}
