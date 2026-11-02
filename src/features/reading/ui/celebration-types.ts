export type DailyCelebration = {
  bookTitle: string;
  pagesRead: number;
  locationsRead?: number;
  streakDays: number;
  source: "PHYSICAL" | "PDF" | "EPUB";
};
