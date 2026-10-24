import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { getR2Config } from "./r2-config";
import { uploadDocumentSchema } from "../domain/upload-document";

const intentSchema = uploadDocumentSchema.extend({
  userId: z.string().uuid(),
  storageKey: z.string().min(1),
  expiresAt: z.number().int().positive(),
});

type UploadIntent = z.infer<typeof intentSchema>;

function sign(payload: string) {
  const { secretAccessKey } = getR2Config();
  return createHmac("sha256", secretAccessKey)
    .update("readon-upload-intent-v1:" + payload)
    .digest("base64url");
}

export function createUploadIntent(
  input: z.infer<typeof uploadDocumentSchema>,
  userId: string,
) {
  const validated = uploadDocumentSchema.parse(input);
  const safeUserId = z.string().uuid().parse(userId);
  const suffix = validated.contentType === "application/pdf" ? "pdf" : "epub";
  const intent: UploadIntent = {
    ...validated,
    userId: safeUserId,
    storageKey: `users/${safeUserId}/books/${validated.bookId}/${randomUUID()}.${suffix}`,
    expiresAt: Date.now() + 10 * 60_000,
  };
  const encoded = Buffer.from(JSON.stringify(intent)).toString("base64url");
  return { intent, token: `${encoded}.${sign(encoded)}` };
}

export function verifyUploadIntent(token: string, userId: string): UploadIntent {
  if (token.length > 4096) throw new Error("Invalid upload intent");
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined) {
    throw new Error("Invalid upload intent");
  }
  const expected = Buffer.from(sign(encoded));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new Error("Invalid upload intent signature");
  }
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid upload intent payload");
  }
  const intent = intentSchema.parse(data);
  if (intent.userId !== userId || intent.expiresAt < Date.now()) {
    throw new Error("Upload intent expired or belongs to another user");
  }
  const suffix = intent.contentType === "application/pdf" ? "pdf" : "epub";
  if (
    !intent.storageKey.startsWith(
      `users/${userId}/books/${intent.bookId}/`,
    ) ||
    !intent.storageKey.endsWith(`.${suffix}`)
  ) {
    throw new Error("Invalid upload storage key");
  }
  return intent;
}
