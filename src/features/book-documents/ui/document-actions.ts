"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { bookDocuments, books } from "@/db/schema";
import { requireAuth } from "@/lib/auth/server";

import { uploadDocumentSchema } from "../domain/upload-document";
import {
  createDownloadUrl,
  createUploadUrl,
  headDocument,
} from "../infrastructure/r2-objects";
import {
  createUploadIntent,
  verifyUploadIntent,
} from "../infrastructure/upload-intent";

function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

async function requireOwnedBook(bookId: string, userId: string) {
  const rows = await database()
    .select({ id: books.id })
    .from(books)
    .where(
      and(
        eq(books.id, bookId),
        eq(books.userId, userId),
        isNull(books.removedAt),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("Book not found");
}

export async function beginDocumentUpload(input: unknown) {
  const user = await requireAuth();
  const parsed = uploadDocumentSchema.parse(input);
  await requireOwnedBook(parsed.bookId, user.id);

  const existing = await database()
    .select({ id: bookDocuments.id })
    .from(bookDocuments)
    .where(
      and(
        eq(bookDocuments.bookId, parsed.bookId),
        eq(bookDocuments.userId, user.id),
      ),
    )
    .limit(1);
  if (existing[0]) throw new Error("This book already has a document");

  const { intent, token } = createUploadIntent(parsed, user.id);
  const request = createUploadUrl(intent.storageKey, intent.contentType);
  return {
    uploadUrl: request.url,
    headers: request.headers,
    uploadToken: token,
    expiresInSeconds: 300,
  };
}

export async function completeDocumentUpload(input: unknown) {
  const user = await requireAuth();
  const { uploadToken } = z.object({ uploadToken: z.string().min(1) }).parse(input);
  const intent = verifyUploadIntent(uploadToken, user.id);
  await requireOwnedBook(intent.bookId, user.id);

  const object = await headDocument(intent.storageKey);
  if (
    object.sizeBytes !== intent.sizeBytes ||
    object.contentType !== intent.contentType
  ) {
    throw new Error("Uploaded file does not match the authorized metadata");
  }

  const rows = await database()
    .insert(bookDocuments)
    .values({
      bookId: intent.bookId,
      userId: user.id,
      format: intent.contentType === "application/pdf" ? "PDF" : "EPUB",
      storageKey: intent.storageKey,
      originalFileName: intent.fileName,
      contentType: intent.contentType,
      sizeBytes: intent.sizeBytes,
    })
    .onConflictDoNothing()
    .returning({ id: bookDocuments.id });

  if (!rows[0]) throw new Error("A document is already attached to this book");
  return { documentId: rows[0].id };
}

export async function getDocumentDownload(input: unknown) {
  const user = await requireAuth();
  const { bookId } = z.object({ bookId: z.string().uuid() }).parse(input);
  await requireOwnedBook(bookId, user.id);

  const rows = await database()
    .select({
      id: bookDocuments.id,
      storageKey: bookDocuments.storageKey,
      contentType: bookDocuments.contentType,
      fileName: bookDocuments.originalFileName,
    })
    .from(bookDocuments)
    .where(
      and(
        eq(bookDocuments.bookId, bookId),
        eq(bookDocuments.userId, user.id),
      ),
    )
    .limit(1);

  const document = rows[0];
  if (!document) throw new Error("Document not found");

  return {
    documentId: document.id,
    url: createDownloadUrl(document.storageKey),
    contentType: document.contentType,
    fileName: document.fileName,
    expiresInSeconds: 300,
  };
}
