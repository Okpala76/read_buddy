"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { DrizzleBookRepository } from "@/features/books/infrastructure";
import { CreateBookUseCase } from "@/features/books/application";
import {
  getGutendexBook,
  searchGutendex,
} from "@/features/books/infrastructure/gutendex";

const searchSchema = z.object({
  query: z.string().trim().min(2).max(100),
  page: z.number().int().min(1).max(100).default(1),
});

export async function searchFreeBooks(input: unknown) {
  await requireAuth();
  const { query, page } = searchSchema.parse(input);
  try {
    const data = await searchGutendex(query, page);
    return { ok: true as const, data };
  } catch (error) {
    console.error("Gutendex search failed", error);
    return { ok: false as const, error: "Free-book search is unavailable right now. Please try again shortly." };
  }
}

const addSchema = z.object({
  gutendexId: z.number().int().positive(),
  totalPages: z.number().int().positive().max(100000),
});

export async function addFreeBook(input: unknown) {
  const user = await requireAuth();
  const { gutendexId, totalPages } = addSchema.parse(input);
  let catalogBook;
  try {
    catalogBook = await getGutendexBook(gutendexId);
  } catch (error) {
    console.error("Gutendex book lookup failed", error);
    return { ok: false as const, error: "This book could not be retrieved right now. Please try again shortly." };
  }
  const repo = new DrizzleBookRepository();
  const existing = await repo.findByUserId(user.id);
  const normalized = (value: string) => value.trim().toLocaleLowerCase();
  if (
    existing.some(
      (book) =>
        normalized(book.title) === normalized(catalogBook.title) &&
        normalized(book.author) === normalized(catalogBook.author),
    )
  ) {
    return { ok: false as const, error: "This book is already in your library" };
  }
  try {
    await new CreateBookUseCase(repo).execute(user.id, {
      title: catalogBook.title,
      author: catalogBook.author,
      totalPages,
      startNow: false,
    });
  } catch (error) {
    console.error("Adding a free book failed", error);
    return { ok: false as const, error: "Could not add this book. Please try again." };
  }
  revalidatePath("/books");
  revalidatePath("/dashboard");
  return { ok: true as const, title: catalogBook.title };
}
