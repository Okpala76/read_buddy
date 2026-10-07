import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("PWA service worker push integration", () => {
  it("handles push and notification clicks in the existing worker", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src", "app", "sw.ts"),
      "utf8",
    );

    expect(source).toContain('self.addEventListener("push"');
    expect(source).toContain('self.addEventListener("notificationclick"');
    expect(source).toContain("self.registration.showNotification");
    expect(source).toContain("self.clients.matchAll");
    expect(source).toContain("self.clients.openWindow");
    expect(source.indexOf('self.addEventListener("push"')).toBeLessThan(
      source.indexOf("serwist.addEventListeners()"),
    );
  });
});
