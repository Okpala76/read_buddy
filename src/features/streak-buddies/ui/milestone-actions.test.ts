import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  send: vi.fn(),
  friends: vi.fn(),
  received: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({ requireAuth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("../infrastructure/milestone-repository", () => ({
  congratulateFriendMilestone: mocks.send,
  readFriendMilestones: mocks.friends,
  readReceivedCongratulations: mocks.received,
}));
import {
  congratulateMilestone,
  getMilestoneActivity,
} from "./milestone-actions";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "viewer" });
});
describe("milestone action boundaries", () => {
  it("rejects unauthenticated requests before accessing milestones", async () => {
    mocks.auth.mockRejectedValue(new Error("Unauthorized"));
    await expect(getMilestoneActivity()).rejects.toThrow("Unauthorized");
    expect(mocks.friends).not.toHaveBeenCalled();
    await expect(
      congratulateMilestone({ milestoneId: crypto.randomUUID() }),
    ).rejects.toThrow("Unauthorized");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("validates the milestone and uses the authenticated sender", async () => {
    await expect(
      congratulateMilestone({ milestoneId: "invalid" }),
    ).rejects.toThrow();
    expect(mocks.send).not.toHaveBeenCalled();
    const milestoneId = crypto.randomUUID();
    await congratulateMilestone({ milestoneId, userId: "forged" });
    expect(mocks.send).toHaveBeenCalledWith("viewer", milestoneId);
  });
  it("scopes both inbox and friend prompts to the viewer", async () => {
    mocks.friends.mockResolvedValue([]);
    mocks.received.mockResolvedValue([]);
    expect(await getMilestoneActivity()).toEqual({ friends: [], received: [] });
    expect(mocks.friends).toHaveBeenCalledWith("viewer");
    expect(mocks.received).toHaveBeenCalledWith("viewer");
  });
});
