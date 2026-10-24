import { z } from "zod";

export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

export const uploadDocumentSchema = z
  .object({
    bookId: z.string().uuid(),
    fileName: z.string().trim().min(1).max(255),
    contentType: z.enum(["application/pdf", "application/epub+zip"]),
    sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
  })
  .refine(
    (file) =>
      file.fileName.toLowerCase().endsWith(
        file.contentType === "application/pdf" ? ".pdf" : ".epub",
      ),
    { message: "File extension does not match the content type" },
  );

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
