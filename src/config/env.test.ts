import { describe, expect, it } from "vitest";

import { vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL ??=
    "postgresql://user:password@localhost:5432/read_buddy";
});

import { serverEnvironmentSchema } from "./env";

const requiredEnvironment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/read_buddy",
};
const publicKey = `B${"A".repeat(86)}`;
const privateKey = "A".repeat(43);

describe("server environment", () => {
  it("treats empty optional VAPID values as unconfigured", () => {
    const parsed = serverEnvironmentSchema.parse({
      ...requiredEnvironment,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "",
      VAPID_PRIVATE_KEY: "",
      VAPID_SUBJECT: "",
    });

    expect(parsed.NEXT_PUBLIC_VAPID_PUBLIC_KEY).toBeUndefined();
    expect(parsed.VAPID_PRIVATE_KEY).toBeUndefined();
    expect(parsed.VAPID_SUBJECT).toBeUndefined();
  });

  it("accepts the configured VAPID contact and base64url keys", () => {
    const parsed = serverEnvironmentSchema.parse({
      ...requiredEnvironment,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey,
      VAPID_PRIVATE_KEY: privateKey,
      VAPID_SUBJECT: "mailto:reminders@read-buddy.ogalandlord.com.ng",
    });

    expect(parsed.VAPID_SUBJECT).toBe(
      "mailto:reminders@read-buddy.ogalandlord.com.ng",
    );
  });

  it("rejects partial VAPID configuration", () => {
    expect(() =>
      serverEnvironmentSchema.parse({
        ...requiredEnvironment,
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey,
      }),
    ).toThrow(/configured together/);
  });

  it("rejects invalid VAPID subjects and key characters", () => {
    expect(() =>
      serverEnvironmentSchema.parse({
        ...requiredEnvironment,
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: "not base64url!",
        VAPID_PRIVATE_KEY: privateKey,
        VAPID_SUBJECT: "ftp://example.com",
      }),
    ).toThrow();
  });
});
