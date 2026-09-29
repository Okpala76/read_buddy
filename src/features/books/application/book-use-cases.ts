import { z } from "zod";
import { Book, BookStatus } from "../domain";
import { BookRepository } from "../domain/book-repository";

export const createBookInputSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().min(1).max(500),
  totalPages: z.number().int().positive(),
});

export type CreateBookInput = z.infer<typeof createBookInputSchema>;

export class CreateBookUseCase {
  constructor(private readonly bookRepository: BookRepository) {}

  async execute(userId: string, input: CreateBookInput): Promise<Book> {
    const { title, author, totalPages } = createBookInputSchema.parse(input);

    // Note: Multiple queued books are allowed, only one READING

    const now = new Date();
    const book = Book.create({
      id: crypto.randomUUID(),
      userId,
      title,
      author,
      totalPages,
      currentPage: 0,
      status: BookStatus.QUEUED,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.bookRepository.save(book);
    return book;
  }
}

export const getBooksInputSchema = z.object({
  status: z.enum(["QUEUED", "READING", "COMPLETED"]).optional(),
});

export type GetBooksInput = z.infer<typeof getBooksInputSchema>;

export class GetBooksUseCase {
  constructor(private readonly bookRepository: BookRepository) {}

  async execute(userId: string, input: GetBooksInput = {}): Promise<Book[]> {
    const books = await this.bookRepository.findByUserId(userId);

    if (input.status) {
      return books.filter((b) => b.status === input.status);
    }
    return books;
  }
}

export class GetCurrentReadingUseCase {
  constructor(private readonly bookRepository: BookRepository) {}

  async execute(userId: string): Promise<Book | null> {
    return this.bookRepository.findReadingByUserId(userId);
  }
}

export const startBookInputSchema = z.object({
  bookId: z.string().uuid(),
});

export type StartBookInput = z.infer<typeof startBookInputSchema>;

export class StartBookUseCase {
  constructor(private readonly bookRepository: BookRepository) {}

  async execute(userId: string, input: StartBookInput): Promise<Book> {
    const { bookId } = startBookInputSchema.parse(input);

    const book = await this.bookRepository.findById(bookId, userId);
    if (!book) {
      throw new Error("Book not found");
    }

    const currentReading =
      await this.bookRepository.findReadingByUserId(userId);
    if (currentReading && currentReading.id !== bookId) {
      throw new Error("Another book is currently being read");
    }

    // If book is already reading, return it as-is
    if (book.status === BookStatus.READING) {
      return book;
    }

    const startedBook = book.startReading();
    await this.bookRepository.save(startedBook);
    return startedBook;
  }
}

export const updateBookProgressInputSchema = z.object({
  bookId: z.string().uuid(),
  page: z.number().int().nonnegative(),
});

export type UpdateBookProgressInput = z.infer<
  typeof updateBookProgressInputSchema
>;

export class UpdateBookProgressUseCase {
  constructor(private readonly bookRepository: BookRepository) {}

  async execute(userId: string, input: UpdateBookProgressInput): Promise<Book> {
    const { bookId, page } = updateBookProgressInputSchema.parse(input);

    const book = await this.bookRepository.findById(bookId, userId);
    if (!book) {
      throw new Error("Book not found");
    }

    if (!book.isReading()) {
      throw new Error("Book is not currently being read");
    }

    const updatedBook = book.updateProgress(page);
    await this.bookRepository.save(updatedBook);
    return updatedBook;
  }
}

export const completeBookInputSchema = z.object({
  bookId: z.string().uuid(),
});

export type CompleteBookInput = z.infer<typeof completeBookInputSchema>;

export class CompleteBookUseCase {
  constructor(private readonly bookRepository: BookRepository) {}

  async execute(userId: string, input: CompleteBookInput): Promise<Book> {
    const { bookId } = completeBookInputSchema.parse(input);

    const book = await this.bookRepository.findById(bookId, userId);
    if (!book) {
      throw new Error("Book not found");
    }

    if (!book.isReading()) {
      throw new Error("Book is not currently being read");
    }

    const completedBook = book.complete();
    await this.bookRepository.save(completedBook);
    return completedBook;
  }
}

export const requeueBookInputSchema = z.object({
  bookId: z.string().uuid(),
});

export type RequeueBookInput = z.infer<typeof requeueBookInputSchema>;

export class RequeueBookUseCase {
  constructor(private readonly bookRepository: BookRepository) {}

  async execute(userId: string, input: RequeueBookInput): Promise<Book> {
    const { bookId } = requeueBookInputSchema.parse(input);

    const book = await this.bookRepository.findById(bookId, userId);
    if (!book) {
      throw new Error("Book not found");
    }

    if (book.isCompleted()) {
      throw new Error("Completed books cannot be requeued");
    }

    const requeuedBook = book.requeue();
    await this.bookRepository.save(requeuedBook);
    return requeuedBook;
  }
}

export const deleteBookInputSchema = z.object({
  bookId: z.string().uuid(),
});

export type DeleteBookInput = z.infer<typeof deleteBookInputSchema>;

export class DeleteBookUseCase {
  constructor(private readonly bookRepository: BookRepository) {}

  async execute(userId: string, input: DeleteBookInput): Promise<void> {
    const { bookId } = deleteBookInputSchema.parse(input);

    const book = await this.bookRepository.findById(bookId, userId);
    if (!book) {
      throw new Error("Book not found");
    }

    if (book.isCompleted()) {
      throw new Error("Completed books cannot be deleted");
    }

    await this.bookRepository.delete(bookId, userId);
  }
}
