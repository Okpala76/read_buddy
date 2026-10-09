import { GetBooksUseCase } from "@/features/books/application";
import { DrizzleBookRepository } from "@/features/books/infrastructure";
import { BooksPage as BooksPageComponent } from "@/features/books/ui/components/BooksPage";
import { toBookView } from "@/features/books/ui/book-view";
import { requireAuth } from "@/lib/auth/server";

export default async function BooksPage() {
  const user = await requireAuth();
  const books = await new GetBooksUseCase(new DrizzleBookRepository()).execute(
    user.id,
    {},
  );

  return <BooksPageComponent books={books.map(toBookView)} />;
}
