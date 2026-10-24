import { describe, expect, it } from "vitest";

import { MAX_DOCUMENT_BYTES, uploadDocumentSchema } from "./upload-document";

const valid = {
  bookId: "8c6fdd11-bb4c-4c73-b899-31a87e1e423c",
  fileName: "my-book.pdf",
  contentType: "application/pdf" as const,
  sizeBytes: 1024,
};

describe("uploadDocumentSchema", () => {
  it("accepts a valid PDF", () => {
    expect(uploadDocumentSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a valid EPUB", () => {
    expect(
      uploadDocumentSchema.safeParse({
        ...valid,
        fileName: "my-book.epub",
        contentType: "application/epub+zip",
      }).success,
    ).toBe(true);
  });

  it("rejects mismatched extensions", () => {
    expect(
      uploadDocumentSchema.safeParse({
        ...valid,
        fileName: "my-book.epub",
      }).success,
    ).toBe(false);
  });

  it("rejects files above the maximum size", () => {
    expect(
      uploadDocumentSchema.safeParse({
        ...valid,
        sizeBytes: MAX_DOCUMENT_BYTES + 1,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid book identifiers and empty files", () => {
    expect(
      uploadDocumentSchema.safeParse({
        ...valid,
        bookId: "not-a-uuid",
        sizeBytes: 0,
      }).success,
    ).toBe(false);
  });
});
