import { describe, expect, it } from "vitest";
import {
  getInstallPlatform,
  isStandaloneInstall,
  shouldShowInstallPrompt,
} from "./install-state";

describe("PWA installation state", () => {
  it("detects iPhone Safari without relying on push support", () => {
    expect(
      getInstallPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("ios-safari");
    expect(
      getInstallPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/128.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("ios-other");
  });

  it("detects Android and desktop independently of browser install prompts", () => {
    expect(
      getInstallPlatform(
        "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
      ),
    ).toBe("android");
    expect(
      getInstallPlatform(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36",
      ),
    ).toBe("desktop");
  });

  it("detects iOS standalone and CSS display-mode standalone", () => {
    expect(isStandaloneInstall(false, true)).toBe(true);
    expect(isStandaloneInstall(true, false)).toBe(true);
    expect(isStandaloneInstall(false, false)).toBe(false);
  });

  it("hides the banner in standalone mode, on desktops, or during cooldown", () => {
    expect(shouldShowInstallPrompt(true, "android", 0, 100)).toBe(false);
    expect(shouldShowInstallPrompt(false, "desktop", 0, 100)).toBe(false);
    expect(shouldShowInstallPrompt(false, "ios-safari", 200, 100)).toBe(false);
    expect(shouldShowInstallPrompt(false, "ios-safari", 100, 100)).toBe(true);
  });
});
