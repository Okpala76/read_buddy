import type { Book, BookStatus } from "@/features/books/domain";

export interface BookView {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  progressPercent: number;
}

export function toBookView(book: Book): BookView {
  const persisted = book.toPersistence();

  return {
    id: persisted.id,
    title: persisted.title,
    author: persisted.author,
    totalPages: persisted.totalPages,
    currentPage: persisted.currentPage,
    status: persisted.status,
    completedAt: persisted.completedAt,
    createdAt: persisted.createdAt,
    updatedAt: persisted.updatedAt,
    progressPercent: book.progressPercent,
  };
}
