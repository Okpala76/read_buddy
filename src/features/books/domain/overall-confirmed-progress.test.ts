import { describe, expect, it } from "vitest";

import { overallConfirmedProgress } from "./overall-confirmed-progress";

describe("overallConfirmedProgress", () => {
  it("uses the furthest confirmed percentage across physical and PDF", () => {
    expect(
      overallConfirmedProgress(
        { currentPage: 60, totalPages: 250 },
        { confirmedPage: 67, pageCount: 268 },
      ),
    ).toBe(25);
  });

  it("uses the physical edition when it is ahead", () => {
    expect(
      overallConfirmedProgress(
        { currentPage: 150, totalPages: 250 },
        { confirmedPage: 67, pageCount: 268 },
      ),
    ).toBe(60);
  });

  it("does not count PDF viewing position as reading", () => {
    expect(
      overallConfirmedProgress(
        { currentPage: 60, totalPages: 250 },
        { confirmedPage: 30, pageCount: 268, viewedPage: 260 },
      ),
    ).toBe(24);
  });

  it("preserves physical progress for a PDF that has not been aligned", () => {
    expect(overallConfirmedProgress({ currentPage: 60, totalPages: 250 })).toBe(
      24,
    );
  });

  it("clamps progress to 100%", () => {
    expect(
      overallConfirmedProgress(
        { currentPage: 250, totalPages: 250 },
        { confirmedPage: 300, pageCount: 268 },
      ),
    ).toBe(100);
  });
});
