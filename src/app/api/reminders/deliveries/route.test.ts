import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const routeMocks = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-1" }),
}));

vi.mock("@/features/reminders/infrastructure", () => ({
  DrizzleReminderDeliveryRepository: class {},
}));

vi.mock("@/features/reminders/application", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/reminders/application")>();
  return {
    ...actual,
    GetReminderDeliveriesUseCase: class {
      execute = routeMocks.execute;
    },
  };
});

import { GET } from "./route";

describe("GET /api/reminders/deliveries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.execute.mockResolvedValue([]);
  });

  it("treats an omitted status query parameter as undefined", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/reminders/deliveries"),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.execute).toHaveBeenCalledWith("user-1", {
      limit: undefined,
      offset: undefined,
      status: undefined,
    });
  });
});
