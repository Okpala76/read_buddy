import { db } from "@/db/client";
import { books } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Book, BookStatus, BookRepository } from "../domain";

function toDomain(row: typeof books.$inferSelect): Book {
  return Book.reconstitute({
    id: row.id,
    userId: row.userId,
    title: row.title,
    author: row.author,
    totalPages: row.totalPages,
    currentPage: row.currentPage,
    status: row.status as BookStatus,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toPersistence(book: Book) {
  const props = book.toPersistence();
  return {
    id: props.id,
    userId: props.userId,
    title: props.title,
    author: props.author,
    totalPages: props.totalPages,
    currentPage: props.currentPage,
    status: props.status,
    completedAt: props.completedAt,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  };
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export class DrizzleBookRepository implements BookRepository {
  async findById(id: string, userId: string): Promise<Book | null> {
    const database = getDb();
    const rows = await database
      .select()
      .from(books)
      .where(and(eq(books.id, id), eq(books.userId, userId)))
      .limit(1);
    if (rows.length === 0) return null;
    return toDomain(rows[0]);
  }

  async findByUserId(userId: string): Promise<Book[]> {
    const database = getDb();
    const rows = await database
      .select()
      .from(books)
      .where(eq(books.userId, userId))
      .orderBy(desc(books.createdAt));
    return rows.map(toDomain);
  }

  async findReadingByUserId(userId: string): Promise<Book | null> {
    const database = getDb();
    const rows = await database
      .select()
      .from(books)
      .where(
        and(eq(books.userId, userId), eq(books.status, BookStatus.READING)),
      )
      .limit(1);
    if (rows.length === 0) return null;
    return toDomain(rows[0]);
  }

  async save(book: Book): Promise<void> {
    const database = getDb();
    const data = toPersistence(book);
    await database
      .insert(books)
      .values(data)
      .onConflictDoUpdate({
        target: books.id,
        set: {
          title: data.title,
          author: data.author,
          totalPages: data.totalPages,
          currentPage: data.currentPage,
          status: data.status,
          completedAt: data.completedAt,
          updatedAt: data.updatedAt,
        },
      });
  }

  async delete(id: string, userId: string): Promise<void> {
    const database = getDb();
    await database
      .delete(books)
      .where(and(eq(books.id, id), eq(books.userId, userId)));
  }
}
