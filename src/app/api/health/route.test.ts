import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const healthMocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  databasePool: { query: healthMocks.query },
}));
vi.mock("@/config/env", () => ({
  config: { HEALTH_CHECK_SECRET: "test-health-secret" },
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  afterAll(() => consoleError.mockRestore());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RELEASE_SHA", "abc123");
  });

  it("reports the database and deployed release", async () => {
    healthMocks.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });

    const response = await GET(
      new Request("http://localhost/api/health", {
        headers: { Authorization: "Bearer test-health-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      database: "ok",
      release: "abc123",
    });
  });

  it("does not expose database errors", async () => {
    healthMocks.query.mockRejectedValue(new Error("connection details"));

    const response = await GET(
      new Request("http://localhost/api/health", {
        headers: { Authorization: "Bearer test-health-secret" },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      database: "unavailable",
    });
  });

  it("rejects unauthenticated probes without querying PostgreSQL", async () => {
    const response = await GET(new Request("http://localhost/api/health"));

    expect(response.status).toBe(401);
    expect(healthMocks.query).not.toHaveBeenCalled();
  });
});
