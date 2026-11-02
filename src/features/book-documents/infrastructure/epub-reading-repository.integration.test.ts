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
  epubPositions,
  pdfReadingStates,
  readingSessions,
  users,
} from "@/db/schema";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/server", () => ({ requireAuth: auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
describe.runIf(process.env.RUN_DATABASE_INTEGRATION_TESTS === "true")(
  "Confirmed digital sessions",
  () => {
    let db: NonNullable<typeof import("@/db/client").db>,
      pool: NonNullable<typeof import("@/db/client").databasePool>,
      repo: typeof import("./epub-reading-repository");
    const owner = crypto.randomUUID(),
      other = crypto.randomUUID();
    let bookId: string;
    beforeAll(async () => {
      const c = await import("@/db/client");
      db = c.db!;
      pool = c.databasePool!;
      repo = await import("./epub-reading-repository");
    });
    beforeEach(async () => {
      await db.insert(users).values(
        [owner, other].map((id) => ({
          id,
          email: `${id}@example.com`,
          timezone: "UTC",
        })),
      );
      const [b] = await db
        .insert(books)
        .values({
          userId: owner,
          title: "Read",
          author: "Author",
          totalPages: 1,
          status: "READING",
        })
        .returning();
      bookId = b.id;
      await db.insert(bookDocuments).values({
        bookId,
        userId: owner,
        format: "EPUB",
        storageKey: `test/${bookId}.epub`,
        originalFileName: "read.epub",
        contentType: "application/epub+zip",
        sizeBytes: 100,
      });
      await db.insert(epubPositions).values({
        bookId,
        userId: owner,
        cfi: "epubcfi(/6/2!)",
        locationIndex: 60,
        locationTotal: 100,
        progressPercent: 60,
        confirmedLocation: 10,
        confirmedPercent: 10,
      });
      auth.mockResolvedValue({ id: owner, timezone: "UTC" });
    });
    afterEach(async () => {
      await db.delete(epubPositions).where(eq(epubPositions.userId, owner));
      await db
        .delete(pdfReadingStates)
        .where(eq(pdfReadingStates.userId, owner));
      await db.delete(readingSessions).where(eq(readingSessions.userId, owner));
      await db.delete(users).where(inArray(users.id, [owner, other]));
    });
    afterAll(async () => {
      if (pool) await pool.end();
    });
    it("does not turn bookmarks into sessions, then records locations without fake pages", async () => {
      expect(
        await db
          .select()
          .from(readingSessions)
          .where(eq(readingSessions.userId, owner)),
      ).toEqual([]);
      const result = await repo.completeEpubSession(owner, {
        bookId,
        locationIndex: 50,
        finished: false,
      });
      expect(result.locationsRead).toBe(40);
      const [s] = await db
        .select()
        .from(readingSessions)
        .where(eq(readingSessions.userId, owner));
      expect(s).toMatchObject({
        source: "EPUB",
        pagesRead: 0,
        locationsRead: 40,
        startPage: 0,
        endPage: 0,
      });
      const [p] = await db
        .select()
        .from(epubPositions)
        .where(eq(epubPositions.bookId, bookId));
      expect(p).toMatchObject({
        locationIndex: 60,
        confirmedLocation: 50,
        confirmedPercent: 50,
      });
    });
    it("deduplicates concurrent confirmation and rejects another reader", async () => {
      const results = await Promise.all([
        repo.completeEpubSession(owner, {
          bookId,
          locationIndex: 50,
          finished: false,
        }),
        repo.completeEpubSession(owner, {
          bookId,
          locationIndex: 50,
          finished: false,
        }),
      ]);
      expect(results.reduce((n, r) => n + r.locationsRead, 0)).toBe(40);
      expect(
        await db
          .select()
          .from(readingSessions)
          .where(eq(readingSessions.userId, owner)),
      ).toHaveLength(1);
      await expect(
        repo.completeEpubSession(other, {
          bookId,
          locationIndex: 55,
          finished: false,
        }),
      ).rejects.toThrow("not found");
    });
    it("rejects unseen locations and requires an explicit finish at the end", async () => {
      await expect(
        repo.completeEpubSession(owner, {
          bookId,
          locationIndex: 80,
          finished: false,
        }),
      ).rejects.toThrow("reached");
      await expect(
        repo.completeEpubSession(owner, {
          bookId,
          locationIndex: 50,
          finished: true,
        }),
      ).rejects.toThrow("end");
      await db
        .update(epubPositions)
        .set({ locationIndex: 100 })
        .where(eq(epubPositions.bookId, bookId));
      await expect(
        repo.completeEpubSession(owner, {
          bookId,
          locationIndex: 100,
          finished: false,
        }),
      ).rejects.toThrow("Confirm");
      await repo.completeEpubSession(owner, {
        bookId,
        locationIndex: 100,
        finished: true,
      });
      expect(
        (await db.select().from(books).where(eq(books.id, bookId)))[0],
      ).toMatchObject({
        status: "COMPLETED",
        currentPage: 0,
        completedViaDocument: true,
      });
    });
    it("qualifies EPUB reading for the daily celebration and streak", async () => {
      const action = await import("../ui/epub-reading-actions");
      const result = await action.completeEpubReading({
        bookId,
        locationIndex: 50,
        finished: false,
      });
      expect(result.celebration).toMatchObject({
        source: "EPUB",
        locationsRead: 40,
        pagesRead: 0,
        streakDays: 1,
      });
    });
    it("completes a PDF without overwriting the physical edition's saved page", async () => {
      await db.delete(epubPositions).where(eq(epubPositions.bookId, bookId));
      await db.delete(bookDocuments).where(eq(bookDocuments.bookId, bookId));
      await db
        .update(books)
        .set({ totalPages: 200, currentPage: 30 })
        .where(eq(books.id, bookId));
      const [d] = await db
        .insert(bookDocuments)
        .values({
          bookId,
          userId: owner,
          format: "PDF",
          storageKey: `test/${bookId}.pdf`,
          originalFileName: "read.pdf",
          contentType: "application/pdf",
          sizeBytes: 100,
        })
        .returning();
      await db.insert(pdfReadingStates).values({
        documentId: d.id,
        userId: owner,
        pageCount: 10,
        alignedPhysicalPage: 30,
        confirmedPage: 0,
        viewedPage: 10,
      });
      const action = await import("../ui/pdf-reading-actions");
      await action.completePdfReading({ bookId, endPage: 10, viewedPage: 10 });
      expect(
        (await db.select().from(books).where(eq(books.id, bookId)))[0],
      ).toMatchObject({
        status: "COMPLETED",
        currentPage: 30,
        completedViaDocument: true,
      });
    });
  },
);
