"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { uploadDocumentSchema } from "../domain/upload-document";
import {
  beginDigitalUpload,
  inspectDigitalUpload,
  finalizeDigitalUpload,
  discardDigitalUpload,
} from "../infrastructure/digital-book-repository";
import { DocumentInspectionError } from "../domain/document-inspection-error";
const uploadIdSchema = z.object({ uploadId: z.string().uuid() });
export async function beginDigitalBook(input: unknown) {
  const user = await requireAuth();
  const args = z
    .object(uploadDocumentSchema.shape)
    .omit({ bookId: true })
    .parse(input);
  const parsed = uploadDocumentSchema.parse({
    ...args,
    bookId: crypto.randomUUID(),
  });
  return beginDigitalUpload(user.id, {
    fileName: parsed.fileName,
    contentType: parsed.contentType,
    sizeBytes: parsed.sizeBytes,
  });
}
export async function inspectDigitalBook(input: unknown) {
  const user = await requireAuth();
  const { uploadId } = uploadIdSchema.parse(input);
  try {
    return await inspectDigitalUpload(user.id, uploadId);
  } catch (cause) {
    if (cause instanceof DocumentInspectionError)
      return { error: cause.message };
    console.error("Digital book inspection failed", cause);
    return {
      error:
        "We couldn't read the uploaded book. Please try again or choose another file.",
    };
  }
}
export async function completeDigitalBook(input: unknown) {
  const user = await requireAuth();
  const parsed = uploadIdSchema
    .extend({
      title: z.string().trim().min(1).max(500),
      author: z.string().trim().max(500).default(""),
      startNow: z.boolean().default(false),
    })
    .parse(input);
  try {
    const result = await finalizeDigitalUpload(user.id, parsed);
    revalidatePath("/books");
    revalidatePath("/dashboard");
    return result;
  } catch (cause) {
    const error = cause as { code?: string; cause?: { code?: string } };
    if (error.code === "23505" || error.cause?.code === "23505")
      throw new Error(
        "Your library changed. Try adding this book to the queue.",
      );
    throw cause;
  }
}

export async function cancelDigitalBook(input: unknown) {
  const user = await requireAuth();
  await discardDigitalUpload(user.id, uploadIdSchema.parse(input).uploadId);
}
