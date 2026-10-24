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
  return searchGutendex(query, page);
}

const addSchema = z.object({
  gutendexId: z.number().int().positive(),
  totalPages: z.number().int().positive().max(100000),
});

export async function addFreeBook(input: unknown) {
  const user = await requireAuth();
  const { gutendexId, totalPages } = addSchema.parse(input);
  const catalogBook = await getGutendexBook(gutendexId);
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
    throw new Error("This book is already in your library");
  }
  await new CreateBookUseCase(repo).execute(user.id, {
    title: catalogBook.title,
    author: catalogBook.author,
    totalPages,
    startNow: false,
  });
  revalidatePath("/books");
  revalidatePath("/dashboard");
  return { title: catalogBook.title };
}
