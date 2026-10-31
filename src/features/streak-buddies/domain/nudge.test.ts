import { describe, expect, it } from "vitest";
import { localDayKey } from "./nudge";

describe("streak nudge day boundaries", () => {
  it("respects user-specific local dates", () => {
    const instant = new Date("2026-10-31T23:30:00Z");
    expect(localDayKey(instant, "Africa/Lagos")).toBe("2026-11-01");
    expect(localDayKey(instant, "America/Toronto")).toBe("2026-10-31");
  });
  it("uses calendar days across daylight saving transitions", () => {
    expect(localDayKey(new Date("2026-11-01T05:30:00Z"), "America/Toronto")).toBe("2026-11-01");
    expect(localDayKey(new Date("2026-11-02T05:30:00Z"), "America/Toronto")).toBe("2026-11-02");
  });
});
