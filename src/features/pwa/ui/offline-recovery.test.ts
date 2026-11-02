import { expect, it } from "vitest";
import { recoveryPath } from "./offline-recovery";
it("returns to the attempted app screen or the last safe app path", () => {
  expect(recoveryPath("/books", "/friends")).toBe("/books");
  expect(recoveryPath("/~offline", "/sessions")).toBe("/sessions");
});
it("rejects external URLs, auth callbacks, query strings, and unsafe paths", () => {
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "/sign-in",
    "/books?token=secret",
    "/books\\evil",
    "/api/health",
    "/books/../../sign-in",
    "/books/%2e%2e/api",
  ]) {
    expect(recoveryPath("/~offline", path)).toBe("/dashboard");
  }
});
