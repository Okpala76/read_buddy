"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { completeEpubSession } from "../infrastructure/epub-reading-repository";
import { celebrationForSavedSession } from "@/features/reading/ui/daily-celebration";
export async function completeEpubReading(input: unknown) {
  const user = await requireAuth();
  const parsed = z
    .object({
      bookId: z.string().uuid(),
      locationIndex: z.number().int().positive().max(1000000),
      finished: z.boolean().default(false),
    })
    .parse(input);
  const result = await completeEpubSession(user.id, parsed);
  const celebration = result.sessionId
    ? await celebrationForSavedSession({
        userId: user.id,
        timezone: user.timezone,
        sessionId: result.sessionId,
        readAt: result.readAt,
        bookTitle: result.bookTitle,
        pagesRead: 0,
        locationsRead: result.locationsRead,
        source: "EPUB",
      })
    : null;
  for (const path of ["/books", "/dashboard", "/sessions", "/analytics"])
    revalidatePath(path);
  return { ...result, celebration };
}
