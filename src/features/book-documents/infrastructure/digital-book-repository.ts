import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db/client";
import {
  books,
  bookDocuments,
  digitalBookUploads,
  pdfReadingStates,
} from "@/db/schema";
import {
  createDownloadUrl,
  createUploadUrl,
  deleteDocument,
  headDocument,
} from "./r2-objects";
import { extractDocumentMetadata } from "./document-metadata";
import type { UploadDocumentInput } from "../domain/upload-document";
function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}
export async function beginDigitalUpload(
  userId: string,
  input: Omit<UploadDocumentInput, "bookId">,
) {
  const expired = await database()
    .select({ id: digitalBookUploads.id })
    .from(digitalBookUploads)
    .where(
      and(
        eq(digitalBookUploads.userId, userId),
        isNull(digitalBookUploads.completedAt),
        lt(digitalBookUploads.expiresAt, new Date()),
      ),
    )
    .limit(10);
  for (const old of expired) {
    try {
      await discardDigitalUpload(userId, old.id);
    } catch {
      break;
    }
  }
  const id = randomUUID();
  const suffix = input.contentType === "application/pdf" ? "pdf" : "epub";
  const storageKey = `users/${userId}/staging/${id}.${suffix}`;
  await database()
    .insert(digitalBookUploads)
    .values({
      id,
      userId,
      ...input,
      storageKey,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });
  return { uploadId: id, ...createUploadUrl(storageKey, input.contentType) };
}
async function ownedUpload(userId: string, id: string) {
  const [row] = await database()
    .select()
    .from(digitalBookUploads)
    .where(
      and(eq(digitalBookUploads.id, id), eq(digitalBookUploads.userId, userId)),
    );
  if (!row) throw new Error("Upload not found.");
  if (!row.completedAt && row.expiresAt < new Date())
    throw new Error("Upload expired. Please select the file again.");
  return row;
}
async function uploadedBytes(row: typeof digitalBookUploads.$inferSelect) {
  const object = await headDocument(row.storageKey);
  if (
    object.sizeBytes !== row.sizeBytes ||
    object.contentType !== row.contentType
  )
    throw new Error("Uploaded file does not match the selected file.");
  const response = await fetch(createDownloadUrl(row.storageKey), {
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok || !response.body)
    throw new Error("Could not read the uploaded file.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > row.sizeBytes)
        throw new Error("Uploaded file exceeds the expected size.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  if (length !== row.sizeBytes) throw new Error("The upload is incomplete.");
  return Buffer.concat(chunks, length);
}
export async function inspectDigitalUpload(userId: string, id: string) {
  const row = await ownedUpload(userId, id);
  const bytes = await uploadedBytes(row);
  const metadata = await extractDocumentMetadata(
    bytes,
    row.contentType,
    row.fileName,
  );
  const fileHash = createHash("sha256").update(bytes).digest("hex");
  await database()
    .update(digitalBookUploads)
    .set({ ...metadata, fileHash })
    .where(
      and(
        eq(digitalBookUploads.id, id),
        eq(digitalBookUploads.userId, userId),
        isNull(digitalBookUploads.completedAt),
      ),
    );
  return metadata;
}
export async function finalizeDigitalUpload(
  userId: string,
  input: { uploadId: string; title: string; author: string; startNow: boolean },
) {
  const row = await ownedUpload(userId, input.uploadId);
  if (row.completedAt) return { bookId: row.id };
  if (!row.fileHash) throw new Error("Review the uploaded book before saving.");
  const bytes = await uploadedBytes(row);
  if (createHash("sha256").update(bytes).digest("hex") !== row.fileHash)
    throw new Error("The file changed. Select it again before saving.");
  // Seal a server-owned copy. The browser's staging PUT URL cannot overwrite it.
  const suffix = row.contentType === "application/pdf" ? "pdf" : "epub";
  const storageKey = `users/${userId}/books/${row.id}/sealed-${row.fileHash}.${suffix}`;
  const request = createUploadUrl(storageKey, row.contentType);
  const response = await fetch(request.url, {
    method: "PUT",
    headers: request.headers,
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Could not save the book file. Try again.");
  const result = await saveDigitalBook(userId, input, storageKey);
  await deleteDocument(row.storageKey).catch(() => undefined);
  return result;
}
/** Atomic finalization; duplicate requests return the same book. */
export async function saveDigitalBook(
  userId: string,
  input: { uploadId: string; title: string; author: string; startNow: boolean },
  storageKey: string,
) {
  return database().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(digitalBookUploads)
      .where(
        and(
          eq(digitalBookUploads.id, input.uploadId),
          eq(digitalBookUploads.userId, userId),
        ),
      )
      .for("update");
    if (!row) throw new Error("Upload not found.");
    if (row.completedAt) return { bookId: row.id };
    if (!row.fileHash || row.expiresAt < new Date())
      throw new Error("Upload expired or was not reviewed.");
    const suffix = row.contentType === "application/pdf" ? "pdf" : "epub";
    if (
      storageKey !==
      `users/${userId}/books/${row.id}/sealed-${row.fileHash}.${suffix}`
    )
      throw new Error("The file changed. Review it again.");
    if (input.startNow) {
      const active = await tx
        .select({ id: books.id })
        .from(books)
        .where(and(eq(books.userId, userId), eq(books.status, "READING")))
        .limit(1);
      if (active.length)
        throw new Error(
          "Move your current book to the queue before starting another.",
        );
    }
    await tx.insert(books).values({
      id: row.id,
      userId,
      title: input.title,
      author: input.author || "Unknown author",
      totalPages: row.pageCount ?? 1,
      currentPage: 0,
      status: input.startNow ? "READING" : "QUEUED",
    });
    const [document] = await tx
      .insert(bookDocuments)
      .values({
        bookId: row.id,
        userId,
        format: row.contentType === "application/pdf" ? "PDF" : "EPUB",
        storageKey,
        originalFileName: row.fileName,
        contentType: row.contentType,
        sizeBytes: row.sizeBytes,
      })
      .returning();
    if (row.contentType === "application/pdf") {
      if (!row.pageCount) throw new Error("PDF page count is missing.");
      await tx.insert(pdfReadingStates).values({
        documentId: document.id,
        userId,
        pageCount: row.pageCount,
        alignedPhysicalPage: 0,
        confirmedPage: 0,
        viewedPage: 1,
      });
    }
    await tx
      .update(digitalBookUploads)
      .set({ completedAt: new Date() })
      .where(eq(digitalBookUploads.id, row.id));
    return { bookId: row.id };
  });
}

export async function discardDigitalUpload(userId: string, id: string) {
  await database().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(digitalBookUploads)
      .where(
        and(
          eq(digitalBookUploads.id, id),
          eq(digitalBookUploads.userId, userId),
        ),
      )
      .for("update");
    if (!row || row.completedAt) return;
    await deleteDocument(row.storageKey);
    if (row.fileHash) {
      const suffix = row.contentType === "application/pdf" ? "pdf" : "epub";
      await deleteDocument(
        `users/${userId}/books/${row.id}/sealed-${row.fileHash}.${suffix}`,
      );
    }
    await tx.delete(digitalBookUploads).where(eq(digitalBookUploads.id, id));
  });
}
