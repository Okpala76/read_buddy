/**
 * How progress is evidenced, independently of where the book originated.
 * No claim is made that a digital confirmation proves comprehension.
 */
export type ReadingEvidence = "OFF_APP_SELF_REPORTED" | "IN_APP_CONFIRMED";

export type BookDocumentFormat = "PDF" | "EPUB";

export interface ConfirmedPage {
  documentId: string;
  pageNumber: number;
}

/**
 * A deliberate page confirmation. It is never called from swipe/scroll handlers.
 * A set of confirmed pages also handles rereads without inflating progress.
 */
export function confirmPage(
  confirmed: ReadonlySet<number>,
  pageNumber: number,
  totalPages: number,
): Set<number> {
  if (
    !Number.isInteger(pageNumber) ||
    !Number.isInteger(totalPages) ||
    totalPages < 1 ||
    pageNumber < 1 ||
    pageNumber > totalPages
  ) {
    throw new Error("Confirmed page must be inside the document");
  }

  const next = new Set(confirmed);
  next.add(pageNumber);
  return next;
}

export function confirmedProgressPercent(
  confirmedPages: ReadonlySet<number>,
  totalPages: number,
): number {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new Error("Document page count must be positive");
  }
  return Math.round((confirmedPages.size / totalPages) * 100);
}
