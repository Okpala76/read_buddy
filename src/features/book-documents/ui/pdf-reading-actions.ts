"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import {
  bookDocuments,
  books,
  pdfReadingStates,
  readingSessions,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth/server";

function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

const documentInput = z.object({ bookId: z.string().uuid() });
const pageInput = documentInput.extend({
  pageCount: z.number().int().positive().max(100000),
  confirmedPage: z.number().int().nonnegative(),
});
const viewedInput = documentInput.extend({
  viewedPage: z.number().int().positive(),
});
const completedInput = documentInput.extend({
  endPage: z.number().int().positive(),
  viewedPage: z.number().int().positive(),
});

async function ownedPdf(bookId: string, userId: string) {
  const rows = await database()
    .select({
      documentId: bookDocuments.id,
      physicalPage: books.currentPage,
      status: books.status,
    })
    .from(bookDocuments)
    .innerJoin(books, eq(books.id, bookDocuments.bookId))
    .where(
      and(
        eq(bookDocuments.bookId, bookId),
        eq(bookDocuments.userId, userId),
        eq(bookDocuments.format, "PDF"),
        eq(books.userId, userId),
        isNull(books.removedAt),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("PDF not found");
  return rows[0];
}

export async function getPdfReadingState(input: unknown) {
  const user = await requireAuth();
  const { bookId } = documentInput.parse(input);
  const document = await ownedPdf(bookId, user.id);
  const state = await database()
    .select({
      pageCount: pdfReadingStates.pageCount,
      confirmedPage: pdfReadingStates.confirmedPage,
      viewedPage: pdfReadingStates.viewedPage,
      alignedPhysicalPage: pdfReadingStates.alignedPhysicalPage,
    })
    .from(pdfReadingStates)
    .where(
      and(
        eq(pdfReadingStates.documentId, document.documentId),
        eq(pdfReadingStates.userId, user.id),
      ),
    )
    .limit(1);
  return { state: state[0] ?? null, physicalPage: document.physicalPage };
}

export async function alignPdfReading(input: unknown) {
  const user = await requireAuth();
  const { bookId, pageCount, confirmedPage } = pageInput.parse(input);
  if (confirmedPage >= pageCount)
    throw new Error("Select a page before the end of the PDF");
  const document = await ownedPdf(bookId, user.id);
  await database()
    .insert(pdfReadingStates)
    .values({
      documentId: document.documentId,
      userId: user.id,
      pageCount,
      alignedPhysicalPage: document.physicalPage,
      confirmedPage,
      viewedPage: Math.min(pageCount, confirmedPage + 1),
    })
    .onConflictDoNothing();
  const result = await getPdfReadingState({ bookId });
  if (!result.state) throw new Error("PDF alignment could not be saved");
  return result.state;
}

export async function savePdfViewedPage(input: unknown) {
  const user = await requireAuth();
  const { bookId, viewedPage } = viewedInput.parse(input);
  const document = await ownedPdf(bookId, user.id);
  await database()
    .update(pdfReadingStates)
    .set({ viewedPage, updatedAt: new Date() })
    .where(
      and(
        eq(pdfReadingStates.documentId, document.documentId),
        eq(pdfReadingStates.userId, user.id),
      ),
    );
}

export async function completePdfReading(input: unknown) {
  const user = await requireAuth();
  const { bookId, endPage, viewedPage } = completedInput.parse(input);
  const document = await ownedPdf(bookId, user.id);
  if (document.status !== "READING")
    throw new Error("Start this book before logging reading");

  const result = await database().transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(pdfReadingStates)
      .where(
        and(
          eq(pdfReadingStates.documentId, document.documentId),
          eq(pdfReadingStates.userId, user.id),
        ),
      )
      .limit(1)
      .for("update");
    const state = rows[0];
    if (!state) throw new Error("Align the PDF before logging a session");
    if (endPage <= state.confirmedPage || endPage > state.pageCount) {
      throw new Error(
        `Choose a completed page after ${state.confirmedPage}, up to ${state.pageCount}`,
      );
    }
    if (viewedPage < 1 || viewedPage > state.pageCount)
      throw new Error("Invalid viewed page");

    const pagesRead = endPage - state.confirmedPage;
    await tx.insert(readingSessions).values({
      userId: user.id,
      bookId,
      startPage: state.confirmedPage,
      endPage,
      pagesRead,
      source: "PDF",
      mood: null,
      readAt: new Date(),
    });
    await tx
      .update(pdfReadingStates)
      .set({
        confirmedPage: endPage,
        viewedPage,
        updatedAt: new Date(),
      })
      .where(eq(pdfReadingStates.id, state.id));
    return { pagesRead, completedPage: endPage };
  });
  for (const path of ["/books", "/dashboard", "/sessions", "/analytics"])
    revalidatePath(path);
  return result;
}
