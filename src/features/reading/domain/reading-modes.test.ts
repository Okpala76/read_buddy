import { describe, expect, it } from "vitest";
import { confirmPage, confirmedProgressPercent } from "./reading-modes";

describe("deliberately confirmed digital page progress", () => {
  it("counts a page only after explicit confirmation", () => {
    const viewedPage = 8;
    const before = new Set<number>();
    expect(confirmedProgressPercent(before, 20)).toBe(0);
    const after = confirmPage(before, viewedPage, 20);
    expect(confirmedProgressPercent(after, 20)).toBe(5);
    expect(before.size).toBe(0);
  });

  it("does not double-count reread pages", () => {
    const pages = new Set([1, 2]);
    const again = confirmPage(pages, 2, 10);
    expect(again.size).toBe(2);
    expect(confirmedProgressPercent(again, 10)).toBe(20);
  });

  it("supports non-contiguous confirmations without treating skipped pages as read", () => {
    const pages = confirmPage(new Set([1]), 7, 10);
    expect([...pages].sort((a, b) => a - b)).toEqual([1, 7]);
    expect(confirmedProgressPercent(pages, 10)).toBe(20);
  });

  it("rejects invalid page numbers", () => {
    expect(() => confirmPage(new Set(), 0, 20)).toThrow();
    expect(() => confirmPage(new Set(), 21, 20)).toThrow();
    expect(() => confirmPage(new Set(), 1.5, 20)).toThrow();
    expect(() => confirmedProgressPercent(new Set(), 0)).toThrow();
  });
});
