import { describe, expect, it } from "vitest";

import {
  normalizePushNotificationPayload,
  resolveNotificationUrl,
} from "./push-notification";

const origin = "https://read-buddy.ogalandlord.com.ng";

describe("push notification payload", () => {
  it("accepts a valid payload and normalizes its application URL", () => {
    expect(
      normalizePushNotificationPayload(
        {
          title: "Reading Buddy",
          body: "Your test notification is working.",
          url: "/dashboard?source=push",
          tag: "reading-buddy-test",
        },
        origin,
      ),
    ).toEqual({
      title: "Reading Buddy",
      body: "Your test notification is working.",
      url: `${origin}/dashboard?source=push`,
      tag: "reading-buddy-test",
    });
  });

  it("uses safe defaults for missing or malformed payloads", () => {
    expect(normalizePushNotificationPayload(undefined, origin)).toEqual({
      title: "Reading Buddy",
      body: "Open Reading Buddy to continue.",
      url: `${origin}/dashboard`,
    });
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "javascript:alert(1)",
  ])("rejects external or unsafe notification target %s", (candidate) => {
    expect(resolveNotificationUrl(candidate, origin)).toBe(
      `${origin}/dashboard`,
    );
  });

  it("allows an absolute same-origin notification target", () => {
    expect(resolveNotificationUrl(`${origin}/books`, origin)).toBe(
      `${origin}/books`,
    );
  });
});
