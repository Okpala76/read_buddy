"use server";

import { requireAuth } from "@/lib/auth/server";
import { DrizzleReadingSessionRepository } from "@/features/reading/infrastructure";
import { DrizzleBookRepository } from "@/features/books/infrastructure";
import {
  LogReadingUseCase,
  logReadingInputSchema,
  GetReadingSessionsUseCase,
  getSessionsInputSchema,
  GetRecentSessionsUseCase,
  GetDailyTargetUseCase,
  UpdateDailyTargetUseCase,
  GetBooksUseCase,
  getBooksInputSchema,
} from "@/features/reading/application";
import { GetCurrentReadingUseCase } from "@/features/books/application";
import { toBookView } from "@/features/books/ui/book-view";
import { toReadingSessionView } from "./reading-session-view";

function getReadingUseCases() {
  const repo = new DrizzleReadingSessionRepository();
  return {
    logReading: new LogReadingUseCase(repo),
    getSessions: new GetReadingSessionsUseCase(repo),
    getRecentSessions: new GetRecentSessionsUseCase(repo),
    getDailyTarget: new GetDailyTargetUseCase(),
    updateDailyTarget: new UpdateDailyTargetUseCase(),
  };
}

function getBookUseCases() {
  const repo = new DrizzleBookRepository();
  return {
    getCurrentReading: new GetCurrentReadingUseCase(repo),
    getBooks: new GetBooksUseCase(repo),
  };
}

export async function logReading(input: unknown) {
  const user = await requireAuth();
  const { logReading } = getReadingUseCases();
  const parsed = logReadingInputSchema.parse(input);
  await logReading.execute(user.id, parsed);
}

export async function getReadingSessions(input: unknown = {}) {
  const user = await requireAuth();
  const { getSessions } = getReadingUseCases();
  const parsed = getSessionsInputSchema.parse(input);
  const sessions = await getSessions.execute(user.id, parsed);
  return sessions.map(toReadingSessionView);
}

export async function getRecentReadingSessions(limit = 10) {
  const user = await requireAuth();
  const { getRecentSessions } = getReadingUseCases();
  const sessions = await getRecentSessions.execute(user.id, limit);
  return sessions.map(toReadingSessionView);
}

export async function getDailyTarget() {
  const user = await requireAuth();
  const { getDailyTarget } = getReadingUseCases();
  return getDailyTarget.execute(user.id);
}

export async function updateDailyTarget(target: number) {
  const user = await requireAuth();
  const { updateDailyTarget } = getReadingUseCases();
  return updateDailyTarget.execute(user.id, target);
}

export async function getCurrentReading() {
  const user = await requireAuth();
  const { getCurrentReading } = getBookUseCases();
  const book = await getCurrentReading.execute(user.id);
  return book ? toBookView(book) : null;
}

export async function getBooks(input: unknown = {}) {
  const user = await requireAuth();
  const { getBooks } = getBookUseCases();
  const parsed = getBooksInputSchema.parse(input);
  const books = await getBooks.execute(user.id, parsed);
  return books.map(toBookView);
}
