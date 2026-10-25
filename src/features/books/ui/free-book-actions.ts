"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { bookDocuments } from "@/db/schema";
import { CreateBookUseCase } from "@/features/books/application";
import { DrizzleBookRepository } from "@/features/books/infrastructure";
import {
  getGutenbergCatalogBook,
  searchGutenbergCatalog,
} from "@/features/books/infrastructure/gutenberg-catalog";
import { createUploadUrl } from "@/features/book-documents/infrastructure/r2-objects";
import { requireAuth } from "@/lib/auth/server";

const initialCatalogIds = { min: 1, max: 25 };
const MAX_EPUB_SIZE = 20 * 1024 * 1024;
const EPUB_TYPE = "application/epub+zip";

function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

export async function searchFreeBooks(input: unknown) {
  await requireAuth();
  const { query, page } = z.object({
    query: z.string().trim().max(100).default(""),
    page: z.number().int().min(1).max(10).default(1),
  }).parse(input);
  try {
    return { ok: true as const, data: await searchGutenbergCatalog(query, page) };
  } catch (error) {
    console.error("Gutenberg catalog search failed", error);
    return {
      ok: false as const,
      error: "Free books are temporarily unavailable. Please try again.",
    };
  }
}

async function downloadVerifiedEpub(url: string) {
  const requested = new URL(url);
  if (requested.protocol !== "https:" ||
      requested.hostname !== "www.gutenberg.org" ||
      !/^\/ebooks\/[1-9]\d*\.epub3\.images$/.test(requested.pathname)) {
    throw new Error("Catalog EPUB URL is not trusted");
  }
  const response = await fetch(url, {
    signal: AbortSignal.timeout(25_000),
    redirect: "follow",
    cache: "no-store",
  });
  if (!response.ok || !response.body ||
      new URL(response.url).hostname !== "www.gutenberg.org") {
    throw new Error("EPUB download is unavailable");
  }
  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (declaredLength > MAX_EPUB_SIZE) throw new Error("EPUB is too large");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.byteLength;
    if (length > MAX_EPUB_SIZE) throw new Error("EPUB exceeds 20 MB");
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks, length);
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("EPUB content is not a valid ZIP archive");
  }
  return bytes;
}

export async function addFreeBook(input: unknown) {
  const user = await requireAuth();
  const { gutenbergId } = z.object({
    gutenbergId: z.number().int().min(initialCatalogIds.min).max(initialCatalogIds.max),
  }).parse(input);
  const book = await getGutenbergCatalogBook(gutenbergId);
  if (!book) return { ok: false as const, error: "Free book not found" };
  const repo = new DrizzleBookRepository();
  const existing = await repo.findByUserId(user.id);
  const normalized = (value: string) => value.trim().toLocaleLowerCase();
  if (existing.some((entry) =>
    normalized(entry.title) === normalized(book.title) &&
    normalized(entry.author) === normalized(book.author)
  )) {
    return { ok: false as const, error: "This book is already in your library" };
  }

  let createdId: string | null = null;
  try {
    const epub = await downloadVerifiedEpub(book.epubUrl);
    // EPUB uses CFI positions, not paper edition page counts.
    // A nonzero placeholder maintains existing physical-book constraints.
    const created = await new CreateBookUseCase(repo).execute(user.id, {
      title: book.title,
      author: book.author,
      totalPages: 1,
      startNow: false,
    });
    createdId = created.id;
    const storageKey = `users/${user.id}/books/${created.id}/${randomUUID()}.epub`;
    const request = createUploadUrl(storageKey, EPUB_TYPE);
    const upload = await fetch(request.url, {
      method: "PUT",
      headers: request.headers,
      body: new Uint8Array(epub),
      signal: AbortSignal.timeout(25_000),
    });
    if (!upload.ok) throw new Error("Unable to store the EPUB in R2");
    await database().insert(bookDocuments).values({
      bookId: created.id,
      userId: user.id,
      format: "EPUB",
      storageKey,
      originalFileName: `gutenberg-${book.id}.epub`,
      contentType: EPUB_TYPE,
      sizeBytes: epub.byteLength,
    });
    revalidatePath("/books");
    revalidatePath("/dashboard");
    return { ok: true as const, title: book.title };
  } catch (error) {
    if (createdId) {
      try { await repo.delete(createdId, user.id); }
      catch (cleanupError) { console.error("Failed to clean up book", cleanupError); }
    }
    console.error("Adding Gutenberg EPUB failed", error);
    return { ok: false as const, error: "Could not download and attach this EPUB. Try again." };
  }
}
