import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  books,
  bookDocuments,
  digitalBookUploads,
  pdfReadingStates,
  readingSessions,
  users,
} from "@/db/schema";
vi.mock("server-only", () => ({}));
describe.runIf(process.env.RUN_DATABASE_INTEGRATION_TESTS === "true")(
  "Upload-first book atomic persistence",
  () => {
    let db: NonNullable<typeof import("@/db/client").db>,
      pool: NonNullable<typeof import("@/db/client").databasePool>,
      repo: typeof import("./digital-book-repository");
    const owner = crypto.randomUUID(),
      other = crypto.randomUUID();
    beforeAll(async () => {
      const client = await import("@/db/client");
      db = client.db!;
      pool = client.databasePool!;
      repo = await import("./digital-book-repository");
    });
    beforeEach(async () => {
      await db
        .insert(users)
        .values(
          [owner, other].map((id) => ({ id, email: `${id}@example.com` })),
        );
    });
    afterEach(async () => {
      const docs = await db
        .select({ id: bookDocuments.id })
        .from(bookDocuments)
        .where(eq(bookDocuments.userId, owner));
      if (docs.length)
        await db.delete(pdfReadingStates).where(
          inArray(
            pdfReadingStates.documentId,
            docs.map((d) => d.id),
          ),
        );
      await db.delete(users).where(inArray(users.id, [owner, other]));
    });
    afterAll(async () => {
      if (pool) await pool.end();
    });
    async function stage(
      type = "application/pdf",
      pageCount: number | null = 12,
    ) {
      const id = crypto.randomUUID();
      const suffix = type === "application/pdf" ? "pdf" : "epub";
      await db.insert(digitalBookUploads).values({
        id,
        userId: owner,
        fileName: `read.${suffix}`,
        contentType: type,
        sizeBytes: 100,
        storageKey: `staging/${id}`,
        expiresAt: new Date(Date.now() + 600000),
        fileHash: "abc123",
        pageCount,
      });
      return {
        input: {
          uploadId: id,
          title: "Digital book",
          author: "",
          startNow: false,
        },
        key: `users/${owner}/books/${id}/sealed-abc123.${suffix}`,
      };
    }
    it("creates a PDF and its ready-to-read baseline without physical reading history", async () => {
      const s = await stage();
      await repo.saveDigitalBook(owner, s.input, s.key);
      const [book] = await db
        .select()
        .from(books)
        .where(eq(books.id, s.input.uploadId));
      expect(book).toMatchObject({
        totalPages: 12,
        currentPage: 0,
        author: "Unknown author",
        status: "QUEUED",
      });
      expect(
        await db
          .select()
          .from(bookDocuments)
          .where(eq(bookDocuments.bookId, book.id)),
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(pdfReadingStates)
          .where(eq(pdfReadingStates.userId, owner)),
      ).toEqual([
        expect.objectContaining({
          pageCount: 12,
          confirmedPage: 0,
          viewedPage: 1,
        }),
      ]);
      expect(
        await db
          .select()
          .from(readingSessions)
          .where(eq(readingSessions.userId, owner)),
      ).toEqual([]);
    });
    it("deduplicates concurrent finalization of the same upload", async () => {
      const s = await stage();
      const results = await Promise.all([
        repo.saveDigitalBook(owner, s.input, s.key),
        repo.saveDigitalBook(owner, s.input, s.key),
      ]);
      expect(results[0]).toEqual(results[1]);
      expect(
        await db.select().from(books).where(eq(books.userId, owner)),
      ).toHaveLength(1);
    });
    it("rejects another owner and changed-file metadata", async () => {
      const s = await stage();
      await expect(repo.saveDigitalBook(other, s.input, s.key)).rejects.toThrow(
        "not found",
      );
      await expect(
        repo.saveDigitalBook(
          owner,
          s.input,
          s.key.replace("abc123", "changed"),
        ),
      ).rejects.toThrow("file changed");
      expect(
        await db.select().from(books).where(eq(books.userId, owner)),
      ).toEqual([]);
    });
    it("rolls back all library rows on incomplete PDF metadata", async () => {
      const s = await stage("application/pdf", null);
      await expect(repo.saveDigitalBook(owner, s.input, s.key)).rejects.toThrow(
        "page count",
      );
      expect(
        await db.select().from(books).where(eq(books.userId, owner)),
      ).toEqual([]);
      expect(
        await db
          .select()
          .from(bookDocuments)
          .where(eq(bookDocuments.userId, owner)),
      ).toEqual([]);
    });
    it("preserves the one-active-book rule and allows retry into the queue", async () => {
      await db.insert(books).values({
        userId: owner,
        title: "Current",
        author: "Author",
        totalPages: 100,
        status: "READING",
      });
      const s = await stage();
      await expect(
        repo.saveDigitalBook(owner, { ...s.input, startNow: true }, s.key),
      ).rejects.toThrow("current book");
      await repo.saveDigitalBook(owner, s.input, s.key);
      expect(
        await db.select().from(books).where(eq(books.userId, owner)),
      ).toHaveLength(2);
    });
    it("adds EPUBs without a user-supplied physical page count", async () => {
      const s = await stage("application/epub+zip", null);
      await repo.saveDigitalBook(owner, s.input, s.key);
      expect(
        await db
          .select()
          .from(bookDocuments)
          .where(eq(bookDocuments.userId, owner)),
      ).toEqual([expect.objectContaining({ format: "EPUB" })]);
      expect(
        await db
          .select()
          .from(pdfReadingStates)
          .where(eq(pdfReadingStates.userId, owner)),
      ).toEqual([]);
    });
  },
);
