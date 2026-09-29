import { Book } from "./book";

export interface BookRepository {
  findById(id: string, userId: string): Promise<Book | null>;
  findByUserId(userId: string): Promise<Book[]>;
  findReadingByUserId(userId: string): Promise<Book | null>;
  save(book: Book): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
}
