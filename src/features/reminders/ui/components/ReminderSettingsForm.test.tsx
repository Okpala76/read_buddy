import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { ReminderSettingsForm } from "./ReminderSettingsForm";

const storedSettings = {
  enabled: true,
  reminderTime: "19:00:00",
  timezone: "America/Toronto",
  updatedAt: "2026-10-05T12:00:00.000Z",
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ReminderSettingsForm", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(storedSettings));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("displays the currently stored timezone", async () => {
    render(<ReminderSettingsForm />);

    expect(await screen.findByLabelText("Timezone")).toHaveValue(
      "America/Toronto",
    );
  });

  it("rejects an invalid timezone before submitting", async () => {
    render(<ReminderSettingsForm />);
    const timezoneInput = await screen.findByLabelText("Timezone");

    fireEvent.change(timezoneInput, { target: { value: "UTC+1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(
      await screen.findByText("Enter a valid IANA timezone"),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("submits a valid timezone only after the user saves", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(storedSettings))
      .mockResolvedValueOnce(
        jsonResponse({ ...storedSettings, timezone: "Africa/Lagos" }),
      );
    render(<ReminderSettingsForm />);
    const timezoneInput = await screen.findByLabelText("Timezone");

    fireEvent.change(timezoneInput, {
      target: { value: "Africa/Lagos" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = fetchMock.mock.calls[1];
    expect(request[0]).toBe("/api/reminders");
    expect(JSON.parse(String(request[1]?.body))).toEqual(
      expect.objectContaining({ timezone: "Africa/Lagos" }),
    );
  });
});
