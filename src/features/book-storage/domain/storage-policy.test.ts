import { describe, expect, it } from "vitest";
import {
  MAX_PDF_BYTES,
  createDocumentObjectKey,
  pdfMagicIsValid,
  pdfUploadInput,
} from "./storage-policy";

describe("PDF storage policy", () => {
  const userId = "1763006f-a83d-4058-8fc6-4f074fa7aa38";
  const documentId = "7a63339b-1d4a-4bd6-987a-2c645622b01f";

  it("isolates documents by authenticated owner", () => {
    expect(createDocumentObjectKey(userId, documentId)).toBe(
      `private/books/${userId}/${documentId}.pdf`,
    );
    expect(() =>
      createDocumentObjectKey("../someone-else", documentId),
    ).toThrow();
  });

  it("rejects oversized and non-PDF uploads", () => {
    const base = {
      bookId: documentId,
      fileName: "book.pdf",
      contentType: "application/pdf",
    };
    expect(
      pdfUploadInput.safeParse({ ...base, sizeBytes: MAX_PDF_BYTES }).success,
    ).toBe(true);
    expect(
      pdfUploadInput.safeParse({ ...base, sizeBytes: MAX_PDF_BYTES + 1 })
        .success,
    ).toBe(false);
    expect(
      pdfUploadInput.safeParse({
        ...base,
        sizeBytes: 8,
        contentType: "text/html",
      }).success,
    ).toBe(false);
  });

  it("checks actual file magic instead of trusting the declared MIME type", () => {
    expect(
      pdfMagicIsValid(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55])),
    ).toBe(true);
    expect(pdfMagicIsValid(new Uint8Array([60, 104, 116, 109, 108]))).toBe(
      false,
    );
  });
});
