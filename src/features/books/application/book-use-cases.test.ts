import { describe, expect, it, vi, beforeEach } from "vitest";
import { Book, BookStatus } from "../domain";
import { BookRepository } from "../domain/book-repository";
import {
  CreateBookUseCase,
  GetBooksUseCase,
  GetCurrentReadingUseCase,
  StartBookUseCase,
  UpdateBookProgressUseCase,
  CompleteBookUseCase,
  RequeueBookUseCase,
  ReopenCompletedBookUseCase,
  DeleteBookUseCase,
} from "./book-use-cases";

const createMockRepo = (): BookRepository => ({
  findById: vi.fn(),
  findByUserId: vi.fn(),
  findReadingByUserId: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  findMaxSessionPageByBookId: vi.fn(),
});

const testUserId = "550e8400-e29b-41d4-a716-446655440000";
const testBookId = "550e8400-e29b-41d4-a716-446655440001";
const otherBookId = "550e8400-e29b-41d4-a716-446655440002";

const baseBook = Book.create({
  id: testBookId,
  userId: testUserId,
  title: "Test Book",
  author: "Test Author",
  totalPages: 300,
  currentPage: 0,
  status: BookStatus.QUEUED,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("CreateBookUseCase", () => {
  let repo: BookRepository;
  let useCase: CreateBookUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new CreateBookUseCase(repo);
  });

  it("creates a new book", async () => {
    vi.mocked(repo.findReadingByUserId).mockResolvedValue(null);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const book = await useCase.execute(testUserId, {
      title: "New Book",
      author: "New Author",
      totalPages: 200,
    });

    expect(book.title).toBe("New Book");
    expect(book.author).toBe("New Author");
    expect(book.totalPages).toBe(200);
    expect(book.status).toBe(BookStatus.QUEUED);
    expect(book.currentPage).toBe(0);
    expect(repo.save).toHaveBeenCalled();
  });

  it("validates input with Zod", async () => {
    await expect(
      useCase.execute(testUserId, {
        title: "",
        author: "Author",
        totalPages: 100,
      }),
    ).rejects.toThrow();
  });
});

describe("GetBooksUseCase", () => {
  let repo: BookRepository;
  let useCase: GetBooksUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new GetBooksUseCase(repo);
  });

  it("returns all books for user", async () => {
    const books = [
      baseBook,
      Book.create({ ...baseBook.toPersistence(), id: otherBookId }),
    ];
    vi.mocked(repo.findByUserId).mockResolvedValue(books);

    const result = await useCase.execute(testUserId);
    expect(result).toHaveLength(2);
  });

  it("filters by status", async () => {
    const books = [
      baseBook,
      Book.create({
        ...baseBook.toPersistence(),
        id: otherBookId,
        status: BookStatus.READING,
      }),
    ];
    vi.mocked(repo.findByUserId).mockResolvedValue(books);

    const result = await useCase.execute(testUserId, { status: "QUEUED" });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(BookStatus.QUEUED);
  });
});

describe("GetCurrentReadingUseCase", () => {
  let repo: BookRepository;
  let useCase: GetCurrentReadingUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new GetCurrentReadingUseCase(repo);
  });

  it("returns current reading book", async () => {
    const readingBook = Book.create({
      ...baseBook.toPersistence(),
      status: BookStatus.READING,
    });
    vi.mocked(repo.findReadingByUserId).mockResolvedValue(readingBook);

    const result = await useCase.execute(testUserId);
    expect(result?.status).toBe(BookStatus.READING);
  });

  it("returns null when no current reading", async () => {
    vi.mocked(repo.findReadingByUserId).mockResolvedValue(null);
    const result = await useCase.execute(testUserId);
    expect(result).toBeNull();
  });
});

describe("StartBookUseCase", () => {
  let repo: BookRepository;
  let useCase: StartBookUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new StartBookUseCase(repo);
  });

  it("starts a queued book", async () => {
    vi.mocked(repo.findById).mockResolvedValue(baseBook);
    vi.mocked(repo.findReadingByUserId).mockResolvedValue(null);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const result = await useCase.execute(testUserId, { bookId: testBookId });
    expect(result.status).toBe(BookStatus.READING);
    expect(repo.save).toHaveBeenCalled();
  });

  it("throws when book not found", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      useCase.execute(testUserId, {
        bookId: "550e8400-e29b-41d4-a716-446655440099",
      }),
    ).rejects.toThrow("Book not found");
  });

  it("throws when another book is reading", async () => {
    const otherBook = Book.create({
      ...baseBook.toPersistence(),
      id: otherBookId,
      status: BookStatus.READING,
    });
    vi.mocked(repo.findById).mockResolvedValue(baseBook);
    vi.mocked(repo.findReadingByUserId).mockResolvedValue(otherBook);

    await expect(
      useCase.execute(testUserId, { bookId: testBookId }),
    ).rejects.toThrow("Another book is currently being read");
  });

  it("allows starting the same book that is already reading", async () => {
    const readingBook = Book.create({
      ...baseBook.toPersistence(),
      status: BookStatus.READING,
    });
    vi.mocked(repo.findById).mockResolvedValue(readingBook);
    vi.mocked(repo.findReadingByUserId).mockResolvedValue(readingBook);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const result = await useCase.execute(testUserId, { bookId: testBookId });
    expect(result.status).toBe(BookStatus.READING);
  });
});

describe("UpdateBookProgressUseCase", () => {
  let repo: BookRepository;
  let useCase: UpdateBookProgressUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new UpdateBookProgressUseCase(repo);
  });

  it("updates progress on reading book", async () => {
    const readingBook = Book.create({
      ...baseBook.toPersistence(),
      status: BookStatus.READING,
    });
    vi.mocked(repo.findById).mockResolvedValue(readingBook);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const result = await useCase.execute(testUserId, {
      bookId: testBookId,
      page: 100,
    });
    expect(result.currentPage).toBe(100);
  });

  it("throws when book not found", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      useCase.execute(testUserId, {
        bookId: "550e8400-e29b-41d4-a716-446655440099",
        page: 10,
      }),
    ).rejects.toThrow("Book not found");
  });

  it("throws when book is not reading", async () => {
    vi.mocked(repo.findById).mockResolvedValue(baseBook);
    await expect(
      useCase.execute(testUserId, { bookId: testBookId, page: 10 }),
    ).rejects.toThrow("Book is not currently being read");
  });

  it("validates input", async () => {
    await expect(
      useCase.execute(testUserId, { bookId: testBookId, page: -1 }),
    ).rejects.toThrow();
  });
});

describe("CompleteBookUseCase", () => {
  let repo: BookRepository;
  let useCase: CompleteBookUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new CompleteBookUseCase(repo);
  });

  it("completes a reading book", async () => {
    const readingBook = Book.create({
      ...baseBook.toPersistence(),
      status: BookStatus.READING,
    });
    vi.mocked(repo.findById).mockResolvedValue(readingBook);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const result = await useCase.execute(testUserId, { bookId: testBookId });
    expect(result.status).toBe(BookStatus.COMPLETED);
    expect(result.currentPage).toBe(300);
  });

  it("throws when book not found", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      useCase.execute(testUserId, {
        bookId: "550e8400-e29b-41d4-a716-446655440099",
      }),
    ).rejects.toThrow("Book not found");
  });

  it("throws when book is not reading", async () => {
    vi.mocked(repo.findById).mockResolvedValue(baseBook);
    await expect(
      useCase.execute(testUserId, { bookId: testBookId }),
    ).rejects.toThrow("Book is not currently being read");
  });
});

describe("RequeueBookUseCase", () => {
  let repo: BookRepository;
  let useCase: RequeueBookUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new RequeueBookUseCase(repo);
  });

  it("requeues a reading book", async () => {
    const readingBook = Book.create({
      ...baseBook.toPersistence(),
      status: BookStatus.READING,
    });
    vi.mocked(repo.findById).mockResolvedValue(readingBook);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const result = await useCase.execute(testUserId, { bookId: testBookId });
    expect(result.status).toBe(BookStatus.QUEUED);
  });

  it("throws when book is completed", async () => {
    const completedBook = Book.create({
      ...baseBook.toPersistence(),
      status: BookStatus.COMPLETED,
      currentPage: 300,
      completedAt: new Date(),
    });
    vi.mocked(repo.findById).mockResolvedValue(completedBook);

    await expect(
      useCase.execute(testUserId, { bookId: testBookId }),
    ).rejects.toThrow("Completed books cannot be requeued");
  });
});

describe("DeleteBookUseCase", () => {
  let repo: BookRepository;
  let useCase: DeleteBookUseCase;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new DeleteBookUseCase(repo);
  });

  it("deletes a queued book", async () => {
    vi.mocked(repo.findById).mockResolvedValue(baseBook);
    vi.mocked(repo.delete).mockResolvedValue(undefined);

    await useCase.execute(testUserId, { bookId: testBookId });
    expect(repo.delete).toHaveBeenCalledWith(testBookId, testUserId);
  });

  it("throws when book not found", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(
      useCase.execute(testUserId, {
        bookId: "550e8400-e29b-41d4-a716-446655440099",
      }),
    ).rejects.toThrow("Book not found");
  });

  it("throws when book is completed", async () => {
    const completedBook = Book.create({
      ...baseBook.toPersistence(),
      status: BookStatus.COMPLETED,
      currentPage: 300,
      completedAt: new Date(),
    });
    vi.mocked(repo.findById).mockResolvedValue(completedBook);

    await expect(
      useCase.execute(testUserId, { bookId: testBookId }),
    ).rejects.toThrow("Completed books cannot be deleted");
  });
});

describe("ReopenCompletedBookUseCase", () => {
  let repo: BookRepository;
  let useCase: ReopenCompletedBookUseCase;

  const completedBook = Book.create({
    ...baseBook.toPersistence(),
    status: BookStatus.COMPLETED,
    currentPage: 300,
    completedAt: new Date(),
  });

  beforeEach(() => {
    repo = createMockRepo();
    repo.findMaxSessionPageByBookId = vi.fn();
    useCase = new ReopenCompletedBookUseCase(repo);
  });

  it("reopens a completed book to READING when no other book is reading", async () => {
    vi.mocked(repo.findById).mockResolvedValue(completedBook);
    vi.mocked(repo.save).mockResolvedValue(undefined);
    vi.mocked(repo.findReadingByUserId).mockResolvedValue(null);
    vi.mocked(repo.findMaxSessionPageByBookId).mockResolvedValue(200);

    const result = await useCase.execute(testUserId, {
      bookId: testBookId,
      resumePage: 200,
    });

    expect(result.status).toBe("reading");
    expect(result.book.status).toBe(BookStatus.READING);
    expect(result.book.currentPage).toBe(200);
    expect(result.book.completedAt).toBeNull();
    expect(repo.save).toHaveBeenCalled();
  });

  it("reopens a completed book to QUEUED when another book is reading", async () => {
    const otherReadingBook = Book.create({
      ...baseBook.toPersistence(),
      id: otherBookId,
      status: BookStatus.READING,
      currentPage: 50,
    });
    vi.mocked(repo.findById).mockResolvedValue(completedBook);
    vi.mocked(repo.save).mockResolvedValue(undefined);
    vi.mocked(repo.findReadingByUserId).mockResolvedValue(otherReadingBook);
    vi.mocked(repo.findMaxSessionPageByBookId).mockResolvedValue(200);

    const result = await useCase.execute(testUserId, {
      bookId: testBookId,
      resumePage: 200,
    });

    expect(result.status).toBe("queued");
    expect(result.book.status).toBe(BookStatus.QUEUED);
    expect(result.book.currentPage).toBe(200);
    expect(result.book.completedAt).toBeNull();
  });

  it("throws when book not found", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    vi.mocked(repo.findMaxSessionPageByBookId).mockResolvedValue(null);

    await expect(
      useCase.execute(testUserId, { bookId: testBookId, resumePage: 100 }),
    ).rejects.toThrow("Book not found");
  });

  it("throws when book is not completed", async () => {
    const readingBook = Book.create({
      ...baseBook.toPersistence(),
      status: BookStatus.READING,
      currentPage: 150,
    });
    vi.mocked(repo.findById).mockResolvedValue(readingBook);
    vi.mocked(repo.findMaxSessionPageByBookId).mockResolvedValue(200);

    await expect(
      useCase.execute(testUserId, { bookId: testBookId, resumePage: 150 }),
    ).rejects.toThrow("Book is not completed");
  });

  it("throws when resume page is below max session page", async () => {
    vi.mocked(repo.findById).mockResolvedValue(completedBook);
    vi.mocked(repo.findMaxSessionPageByBookId).mockResolvedValue(250);

    await expect(
      useCase.execute(testUserId, { bookId: testBookId, resumePage: 200 }),
    ).rejects.toThrow("Cannot reopen before page 250");
  });

  it("throws when max session page equals total pages", async () => {
    vi.mocked(repo.findById).mockResolvedValue(completedBook);
    vi.mocked(repo.findMaxSessionPageByBookId).mockResolvedValue(300);

    await expect(
      useCase.execute(testUserId, { bookId: testBookId, resumePage: 200 }),
    ).rejects.toThrow("A reading session already reaches the final page");
  });

  it("validates input with Zod", async () => {
    await expect(
      useCase.execute(testUserId, { bookId: "invalid-uuid", resumePage: 100 }),
    ).rejects.toThrow();
  });
});
