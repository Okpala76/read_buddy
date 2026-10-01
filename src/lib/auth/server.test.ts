import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";

import { getCurrentUser, requireAuth } from "@/lib/auth/server";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn<() => Promise<Session | null>>(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

describe("Server auth utilities", () => {
  it("getCurrentUser returns null when no session", async () => {
    authMock.mockResolvedValue(null);

    const user = await getCurrentUser();

    expect(user).toBeNull();
  });

  it("getCurrentUser returns user when session exists", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.png",
      },
      expires: "2025-01-01T00:00:00.000Z",
    });

    const user = await getCurrentUser();

    expect(user).toEqual({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
    });
  });

  it("requireAuth throws when no user", async () => {
    authMock.mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });

  it("requireAuth returns user when authenticated", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      },
      expires: "2025-01-01T00:00:00.000Z",
    });

    const user = await requireAuth();

    expect(user).toEqual({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    });
  });
});
