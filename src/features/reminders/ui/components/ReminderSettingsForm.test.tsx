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
  emailEnabled: true,
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

    expect(await screen.findByLabelText("Account timezone")).toHaveValue(
      "America/Toronto",
    );
  });

  it("rejects an invalid timezone before submitting", async () => {
    render(<ReminderSettingsForm />);
    const timezoneInput = await screen.findByLabelText("Account timezone");

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
    const timezoneInput = await screen.findByLabelText("Account timezone");

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

  it("persists the reading reminder toggle when settings are saved", async () => {
    const disabledSettings = { ...storedSettings, enabled: false };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(disabledSettings))
      .mockResolvedValueOnce(jsonResponse(storedSettings));
    render(<ReminderSettingsForm />);

    fireEvent.click(await screen.findByLabelText("Reading reminders"));
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(
      expect.objectContaining({ enabled: true }),
    );
  });

  it("does not render editable defaults when loading fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Database unavailable" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<ReminderSettingsForm />);

    expect(
      await screen.findByText(/settings could not be loaded/i),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Reading reminders"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry loading settings/i }),
    ).toBeVisible();
  });

  it("loads settings after retrying a failed request", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse(storedSettings));
    render(<ReminderSettingsForm />);

    fireEvent.click(
      await screen.findByRole("button", { name: /retry loading settings/i }),
    );

    expect(await screen.findByLabelText("Account timezone")).toHaveValue(
      "America/Toronto",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
