import { describe, expect, it } from "vitest";
import { reachedMilestone } from "./milestone";
function dates(count: number) {
  return Array.from(
    { length: count },
    (_, i) => new Date(Date.UTC(2026, 0, i + 1, 12)),
  );
}
describe("reading milestones", () => {
  for (const days of [10, 50, 100])
    it(`recognizes ${days} consecutive days`, () => {
      const sessions = dates(days);
      expect(reachedMilestone(sessions, "UTC", sessions.at(-1)!)).toEqual({
        days,
        localDay: sessions.at(-1)!.toISOString().slice(0, 10),
      });
    });
  it("does not count duplicate sessions as extra reading days", () => {
    const sessions = dates(9);
    expect(
      reachedMilestone([...sessions, ...sessions], "UTC", sessions.at(-1)!),
    ).toBeNull();
  });
  it("requires a continuous streak and reading on the milestone date", () => {
    const sessions = dates(10);
    expect(
      reachedMilestone(sessions.slice(1), "UTC", sessions.at(-1)!),
    ).toBeNull();
    expect(
      reachedMilestone(sessions, "UTC", new Date("2026-01-11T12:00:00Z")),
    ).toBeNull();
  });
  it("uses the reader's local day across UTC midnight", () => {
    const sessions = dates(9);
    sessions.push(new Date("2026-01-09T23:30:00Z"));
    expect(
      reachedMilestone(sessions, "Africa/Lagos", sessions.at(-1)!),
    ).toEqual({ days: 10, localDay: "2026-01-10" });
  });
  it("handles daylight saving changes by calendar day", () => {
    const sessions = Array.from(
      { length: 10 },
      (_, i) => new Date(Date.UTC(2026, 9, 25 + i, 12)),
    );
    expect(
      reachedMilestone(sessions, "America/Toronto", sessions.at(-1)!),
    ).toEqual({ days: 10, localDay: "2026-11-03" });
  });
  it("does not announce non-milestone streak lengths", () => {
    for (const length of [0, 9, 11, 49, 51, 101]) {
      const sessions = dates(length);
      expect(
        reachedMilestone(sessions, "UTC", sessions.at(-1) ?? new Date()),
      ).toBeNull();
    }
  });
});
