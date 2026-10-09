import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { ReminderSettingsForm } from "./ReminderSettingsForm";

const { updateReminderPreferenceMock } = vi.hoisted(() => ({
  updateReminderPreferenceMock: vi.fn(),
}));

vi.mock("../reminder-actions", () => ({
  updateReminderPreference: updateReminderPreferenceMock,
}));

const storedSettings = {
  enabled: true,
  emailEnabled: true,
  reminderTime: "19:00:00",
  timezone: "America/Toronto",
  updatedAt: "2026-10-05T12:00:00.000Z",
};

describe("ReminderSettingsForm", () => {
  beforeEach(() => {
    updateReminderPreferenceMock.mockReset();
    updateReminderPreferenceMock.mockResolvedValue(storedSettings);
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

  it("displays the server-provided timezone", () => {
    render(<ReminderSettingsForm initialPreference={storedSettings} />);

    expect(screen.getByLabelText("Account timezone")).toHaveValue(
      "America/Toronto",
    );
  });

  it("rejects an invalid timezone before submitting", async () => {
    render(<ReminderSettingsForm initialPreference={storedSettings} />);
    fireEvent.change(screen.getByLabelText("Account timezone"), {
      target: { value: "UTC+1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(
      await screen.findByText("Enter a valid IANA timezone"),
    ).toBeVisible();
    expect(updateReminderPreferenceMock).not.toHaveBeenCalled();
  });

  it("submits a valid timezone through the Server Action", async () => {
    updateReminderPreferenceMock.mockResolvedValue({
      ...storedSettings,
      timezone: "Africa/Lagos",
    });
    render(<ReminderSettingsForm initialPreference={storedSettings} />);

    fireEvent.change(screen.getByLabelText("Account timezone"), {
      target: { value: "Africa/Lagos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() =>
      expect(updateReminderPreferenceMock).toHaveBeenCalledWith(
        expect.objectContaining({ timezone: "Africa/Lagos" }),
      ),
    );
  });

  it("persists the reading reminder toggle when settings are saved", async () => {
    const disabledSettings = { ...storedSettings, enabled: false };
    render(<ReminderSettingsForm initialPreference={disabledSettings} />);

    fireEvent.click(screen.getByLabelText("Reading reminders"));
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() =>
      expect(updateReminderPreferenceMock).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      ),
    );
  });

  it("shows an error without replacing server-provided settings", async () => {
    updateReminderPreferenceMock.mockRejectedValue(new Error("Unavailable"));
    render(<ReminderSettingsForm initialPreference={storedSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(
      await screen.findByText("Failed to save reminder settings"),
    ).toBeVisible();
    expect(screen.getByLabelText("Account timezone")).toHaveValue(
      "America/Toronto",
    );
  });
});
