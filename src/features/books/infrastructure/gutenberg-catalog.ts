import "server-only";

import { and, asc, count, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db/client";
import { gutenbergCatalog } from "@/db/schema/gutenberg-catalog";

export type FreeBook = {
  id: number;
  title: string;
  author: string;
  downloads: number;
  epubAvailable: boolean;
};

function database() {
  if (!db) throw new Error("Book catalog database is unavailable");
  return db;
}

export async function searchGutenbergCatalog(query: string, page = 1) {
  const term = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
  const filter = and(
    eq(gutenbergCatalog.language, "en"),
    or(
      ilike(gutenbergCatalog.title, `%${term}%`),
      ilike(gutenbergCatalog.author, `%${term}%`),
    ),
  );
  const [totals, rows] = await Promise.all([
    database().select({ value: count() }).from(gutenbergCatalog).where(filter),
    database()
      .select()
      .from(gutenbergCatalog)
      .where(filter)
      .orderBy(asc(gutenbergCatalog.title), asc(gutenbergCatalog.id))
      .limit(24)
      .offset((page - 1) * 24),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    count: total,
    hasNext: page * 24 < total,
    books: rows.map((book): FreeBook => ({
        id: book.id,
        title: book.title,
        author: book.author,
        downloads: 0,
        epubAvailable: true,
    })),
  };
}

export async function getGutenbergCatalogBook(id: number) {
  const rows = await database()
    .select()
    .from(gutenbergCatalog)
    .where(eq(gutenbergCatalog.id, id))
    .limit(1);
  return rows[0] ?? null;
}
