import { expect, it } from "vitest";
import { GET } from "./route";
it("echoes a valid nonce without exposing health or user data", async () => {
  const nonce = crypto.randomUUID();
  const response = await GET(
    new Request(`https://example.test/api/connection?nonce=${nonce}`),
  );
  expect(await response.json()).toEqual({ reachable: true, nonce });
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});
it("rejects malformed probes without caching them", async () => {
  const response = await GET(
    new Request("https://example.test/api/connection?nonce=bad"),
  );
  expect(response.status).toBe(400);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
