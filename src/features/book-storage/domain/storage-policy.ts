import { z } from "zod";

/**
 * Deliberately small initial upload policy. Files are validated again from R2
 * before being attached to a user's library.
 */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

export const pdfUploadInput = z.object({
  bookId: z.uuid(),
  fileName: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive().max(MAX_PDF_BYTES),
  contentType: z.literal("application/pdf"),
});

export function createDocumentObjectKey(userId: string, documentId: string) {
  if (
    !z.uuid().safeParse(userId).success ||
    !z.uuid().safeParse(documentId).success
  ) {
    throw new Error("Invalid document storage owner or identifier");
  }
  return `private/books/${userId}/${documentId}.pdf`;
}

export function pdfMagicIsValid(bytes: Uint8Array): boolean {
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  return magic.every((byte, index) => bytes[index] === byte);
}
