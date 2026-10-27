import { describe, expect, it } from "vitest";
import {
  canReplyToStreakInvite,
  mayChangeStreakPartnership,
} from "./partnership";

describe("one-to-one streak partnerships", () => {
  it("inviter cannot accept their own request", () => {
    expect(
      canReplyToStreakInvite({ status: "PENDING", invitedByUserId: "a" }, "a"),
    ).toBe(false);
    expect(
      canReplyToStreakInvite({ status: "PENDING", invitedByUserId: "a" }, "b"),
    ).toBe(true);
  });
  it("either partner can pause, only pauser can resume", () => {
    expect(
      mayChangeStreakPartnership(
        { status: "ACTIVE", pausedByUserId: null },
        "a",
        "PAUSE",
      ),
    ).toBe(true);
    expect(
      mayChangeStreakPartnership(
        { status: "PAUSED", pausedByUserId: "b" },
        "a",
        "RESUME",
      ),
    ).toBe(false);
    expect(
      mayChangeStreakPartnership(
        { status: "PAUSED", pausedByUserId: "b" },
        "b",
        "RESUME",
      ),
    ).toBe(true);
  });
  it("either partner can end and ended cannot be silently reactivated", () => {
    expect(
      mayChangeStreakPartnership(
        { status: "PAUSED", pausedByUserId: "b" },
        "a",
        "END",
      ),
    ).toBe(true);
    expect(
      mayChangeStreakPartnership(
        { status: "ENDED", pausedByUserId: null },
        "a",
        "RESUME",
      ),
    ).toBe(false);
  });
});
