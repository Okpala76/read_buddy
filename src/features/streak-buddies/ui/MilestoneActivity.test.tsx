import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("./milestone-actions", () => ({ congratulateMilestone: send }));
import { MilestoneActivity } from "./MilestoneActivity";
const activity = {
  friends: [{ id: "milestone", days: 10, name: "Reader", sent: false }],
  received: [],
};
afterEach(cleanup);
beforeEach(() => {
  send.mockReset().mockResolvedValue(undefined);
});
it("sends only after an explicit click and disables repeated delivery", async () => {
  render(<MilestoneActivity activity={activity} />);
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Congratulate Reader on 10 days" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Congratulated Reader on 10 days" }),
    ).toBeDisabled(),
  );
  expect(send).toHaveBeenCalledExactlyOnceWith({ milestoneId: "milestone" });
});
it("allows retry after a failed send", async () => {
  send.mockRejectedValueOnce(new Error("Try later"));
  render(<MilestoneActivity activity={activity} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Congratulate Reader on 10 days" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Try later");
  expect(
    screen.getByRole("button", { name: "Congratulate Reader on 10 days" }),
  ).toBeEnabled();
});
it("shows saved deliveries and predefined received messages", () => {
  render(
    <MilestoneActivity
      activity={{
        friends: [{ ...activity.friends[0], sent: true }],
        received: [{ id: "received", days: 50, name: "Friend" }],
      }}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Congratulated Reader on 10 days" }),
  ).toBeDisabled();
  expect(
    screen.getByText(
      /Friend says: Congratulations on 50 consecutive reading days/,
    ),
  ).toBeVisible();
});
