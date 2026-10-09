import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser, requireAuth } from "@/lib/auth/server";

vi.mock("server-only", () => ({}));

const {
  authMock,
  authProtectMock,
  currentUserMock,
  findUserMock,
  provisionUserMock,
} = vi.hoisted(() => {
  const authProtectMock = vi.fn().mockResolvedValue(undefined);

  return {
    authMock: Object.assign(vi.fn(), { protect: authProtectMock }),
    authProtectMock,
    currentUserMock: vi.fn(),
    findUserMock: vi.fn(),
    provisionUserMock: vi.fn(),
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/features/auth/infrastructure/drizzle-user-repository", () => ({
  findLocalUserByClerkId: findUserMock,
  provisionLocalUser: provisionUserMock,
}));

describe("Server auth utilities", () => {
  beforeEach(() => {
    authProtectMock.mockImplementation(async () => authMock());
  });

  it("getCurrentUser returns null when no session", async () => {
    authMock.mockResolvedValue({ userId: null });

    const user = await getCurrentUser();

    expect(user).toBeNull();
  });

  it("getCurrentUser returns user when session exists", async () => {
    authMock.mockResolvedValue({ userId: "clerk-user-123" });
    findUserMock.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
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
    authMock.mockResolvedValue({ userId: null });

    await expect(requireAuth()).rejects.toThrow("Unauthorized");
    expect(authProtectMock).toHaveBeenCalled();
  });

  it("requireAuth returns user when authenticated", async () => {
    authMock.mockResolvedValue({ userId: "clerk-user-123" });
    findUserMock.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      image: null,
    });

    const user = await requireAuth();

    expect(user).toEqual({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      image: null,
    });
  });

  it("provisions a local UUID user from a verified Clerk profile", async () => {
    authMock.mockResolvedValue({ userId: "clerk-user-123" });
    findUserMock.mockResolvedValue(null);
    currentUserMock.mockResolvedValue({
      fullName: "Test User",
      firstName: "Test",
      lastName: "User",
      imageUrl: "https://example.com/avatar.png",
      primaryEmailAddress: {
        emailAddress: "Test@Example.com",
        verification: { status: "verified" },
      },
    });
    provisionUserMock.mockResolvedValue({
      id: "local-uuid",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
    });

    await expect(getCurrentUser()).resolves.toEqual({
      id: "local-uuid",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
    });
    expect(provisionUserMock).toHaveBeenCalledWith({
      clerkUserId: "clerk-user-123",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
    });
  });
});
