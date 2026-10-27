import { describe, expect, it } from "vitest";
import { canRespondToFriendRequest, friendshipPair } from "./friendship";

describe("reading friendships", () => {
  it("orders reverse invitations identically", () => {
    expect(friendshipPair("a", "z")).toEqual(friendshipPair("z", "a"));
  });
  it("prevents inviting oneself", () => {
    expect(() => friendshipPair("a", "a")).toThrow();
  });
  it("only the invitee can accept a pending request", () => {
    const pending = { ...friendshipPair("a", "z"), invitedByUserId: "a", status: "PENDING" as const };
    expect(canRespondToFriendRequest(pending, "z")).toBe(true);
    expect(canRespondToFriendRequest(pending, "a")).toBe(false);
    expect(canRespondToFriendRequest({ ...pending, status: "ACCEPTED" }, "z")).toBe(false);
  });
});
