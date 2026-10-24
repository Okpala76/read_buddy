import { z } from "zod";

const authorSchema = z.object({ name: z.string() });
const bookSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  authors: z.array(authorSchema),
  formats: z.record(z.string(), z.string()).optional(),
  download_count: z.number().optional(),
});
const responseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  results: z.array(bookSchema),
});

export type FreeBook = {
  id: number;
  title: string;
  author: string;
  downloads: number;
  epubAvailable: boolean;
};

export function normalizeFreeBook(book: z.infer<typeof bookSchema>): FreeBook {
  return {
    id: book.id,
    title: book.title,
    author:
      book.authors.map((author) => author.name).join(", ") || "Unknown author",
    downloads: book.download_count ?? 0,
    epubAvailable: Object.keys(book.formats ?? {}).some((format) =>
      format.startsWith("application/epub+zip"),
    ),
  };
}

function catalogUrl(path: string): string {
  const base = process.env.GUTENDEX_API_BASE_URL;
  if (!base) {
    throw new Error("GUTENDEX_API_BASE_URL is not configured");
  }
  const parsed = new URL(base);
  if (parsed.protocol !== "https:") {
    throw new Error("Gutendex API must use HTTPS");
  }
  return new URL(
    path,
    parsed.href.endsWith("/") ? parsed.href : parsed.href + "/",
  ).toString();
}

export async function searchGutendex(
  query: string,
  page = 1,
): Promise<{
  count: number;
  hasNext: boolean;
  books: FreeBook[];
}> {
  const params = new URLSearchParams({
    search: query,
    page: String(page),
  });
  const response = await fetch(catalogUrl(`books/?${params}`), {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Free-book catalog is temporarily unavailable");
  const data = responseSchema.parse(await response.json());
  return {
    count: data.count,
    hasNext: Boolean(data.next),
    books: data.results.map(normalizeFreeBook),
  };
}

export async function getGutendexBook(id: number): Promise<FreeBook> {
  const response = await fetch(catalogUrl(`books/${id}/`), {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("This free book is no longer available");
  return normalizeFreeBook(bookSchema.parse(await response.json()));
}
