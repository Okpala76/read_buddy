"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { books, epubPositions } from "@/db/schema";
import { requireAuth } from "@/lib/auth/server";

const inputSchema = z.object({
  bookId: z.string().uuid(),
  cfi: z.string().min(5).max(2048),
});

function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

export async function loadEpubPosition(input: unknown) {
  const user = await requireAuth();
  const { bookId } = z.object({ bookId: z.string().uuid() }).parse(input);
  const rows = await database()
    .select({ cfi: epubPositions.cfi })
    .from(epubPositions)
    .innerJoin(books, eq(books.id, epubPositions.bookId))
    .where(
      and(
        eq(epubPositions.bookId, bookId),
        eq(epubPositions.userId, user.id),
        eq(books.userId, user.id),
        isNull(books.removedAt),
      ),
    )
    .limit(1);
  return rows[0]?.cfi ?? null;
}

export async function saveEpubPosition(input: unknown) {
  const user = await requireAuth();
  const { bookId, cfi } = inputSchema.parse(input);
  const owned = await database()
    .select({ id: books.id })
    .from(books)
    .where(
      and(
        eq(books.id, bookId),
        eq(books.userId, user.id),
        isNull(books.removedAt),
      ),
    )
    .limit(1);
  if (!owned[0]) throw new Error("Book not found");
  await database()
    .insert(epubPositions)
    .values({ bookId, userId: user.id, cfi, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: epubPositions.bookId,
      set: { cfi, updatedAt: new Date() },
    });
}
