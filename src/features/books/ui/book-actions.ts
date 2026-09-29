"use server";

import { requireAuth } from "@/lib/auth/server";
import { DrizzleBookRepository } from "@/features/books/infrastructure";
import {
  CreateBookUseCase,
  createBookInputSchema,
  GetBooksUseCase,
  getBooksInputSchema,
  GetCurrentReadingUseCase,
  StartBookUseCase,
  startBookInputSchema,
  UpdateBookProgressUseCase,
  updateBookProgressInputSchema,
  CompleteBookUseCase,
  completeBookInputSchema,
  RequeueBookUseCase,
  requeueBookInputSchema,
  DeleteBookUseCase,
  deleteBookInputSchema,
} from "@/features/books/application";

function getUseCases() {
  const repo = new DrizzleBookRepository();
  return {
    createBook: new CreateBookUseCase(repo),
    getBooks: new GetBooksUseCase(repo),
    getCurrentReading: new GetCurrentReadingUseCase(repo),
    startBook: new StartBookUseCase(repo),
    updateBookProgress: new UpdateBookProgressUseCase(repo),
    completeBook: new CompleteBookUseCase(repo),
    requeueBook: new RequeueBookUseCase(repo),
    deleteBook: new DeleteBookUseCase(repo),
  };
}

export async function createBook(input: unknown) {
  const user = await requireAuth();
  const { createBook } = getUseCases();
  const parsed = createBookInputSchema.parse(input);
  return createBook.execute(user.id, parsed);
}

export async function getBooks(input: unknown = {}) {
  const user = await requireAuth();
  const { getBooks } = getUseCases();
  const parsed = getBooksInputSchema.parse(input);
  return getBooks.execute(user.id, parsed);
}

export async function getCurrentReading() {
  const user = await requireAuth();
  const { getCurrentReading } = getUseCases();
  return getCurrentReading.execute(user.id);
}

export async function startBook(input: unknown) {
  const user = await requireAuth();
  const { startBook } = getUseCases();
  const parsed = startBookInputSchema.parse(input);
  return startBook.execute(user.id, parsed);
}

export async function updateBookProgress(input: unknown) {
  const user = await requireAuth();
  const { updateBookProgress } = getUseCases();
  const parsed = updateBookProgressInputSchema.parse(input);
  return updateBookProgress.execute(user.id, parsed);
}

export async function completeBook(input: unknown) {
  const user = await requireAuth();
  const { completeBook } = getUseCases();
  const parsed = completeBookInputSchema.parse(input);
  return completeBook.execute(user.id, parsed);
}

export async function requeueBook(input: unknown) {
  const user = await requireAuth();
  const { requeueBook } = getUseCases();
  const parsed = requeueBookInputSchema.parse(input);
  return requeueBook.execute(user.id, parsed);
}

export async function deleteBook(input: unknown) {
  const user = await requireAuth();
  const { deleteBook } = getUseCases();
  const parsed = deleteBookInputSchema.parse(input);
  return deleteBook.execute(user.id, parsed);
}
