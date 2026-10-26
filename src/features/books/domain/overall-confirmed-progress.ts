/**
 * Physical and PDF are separate editions of one book. The larger confirmed
 * completion fraction is the best available estimate of overall completion.
 * Never add the percentages or use the PDF viewing position.
 */
export function overallConfirmedProgress(
  physical: { currentPage: number; totalPages: number },
  pdf?: { confirmedPage: number; pageCount: number; viewedPage?: number },
): number {
  const physicalFraction =
    physical.totalPages > 0
      ? Math.max(0, Math.min(1, physical.currentPage / physical.totalPages))
      : 0;
  const pdfFraction =
    pdf && pdf.pageCount > 0
      ? Math.max(0, Math.min(1, pdf.confirmedPage / pdf.pageCount))
      : 0;
  return Math.round(Math.max(physicalFraction, pdfFraction) * 100);
}
