import { existsSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { OfflinePageContent } from "@/features/pwa/ui/OfflinePageContent";

import { isSensitivePathname, isStaticAssetRequest } from "./cache-policy";

describe("PWA manifest", () => {
  it("describes an installable standalone application", () => {
    const value = manifest();

    expect(value).toMatchObject({
      name: "Reading Buddy",
      short_name: "Reading Buddy",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f7fbf8",
      theme_color: "#00522c",
    });
  });

  it("references icons that exist in the public directory", () => {
    const icons = manifest().icons ?? [];

    expect(icons).toHaveLength(3);
    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      expect(
        existsSync(
          path.join(process.cwd(), "public", icon.src.replace(/^\//, "")),
        ),
      ).toBe(true);
    }
  });
});

describe("PWA cache policy", () => {
  it.each([
    "/api/analytics",
    "/api/cron/reminders",
    "/__clerk/handshake",
    "/sign-in",
    "/sign-in/sso-callback",
    "/sign-up",
  ])("keeps %s on the network", (pathname) => {
    expect(isSensitivePathname(pathname)).toBe(true);
  });

  it("does not classify authenticated pages as static assets", () => {
    expect(isSensitivePathname("/dashboard")).toBe(false);
    expect(
      isStaticAssetRequest({
        request: new Request("https://reading.example/dashboard"),
        sameOrigin: true,
        url: new URL("https://reading.example/dashboard"),
      }),
    ).toBe(false);
  });

  it("only permits same-origin immutable Next.js assets", () => {
    expect(
      isStaticAssetRequest({
        request: new Request(
          "https://reading.example/_next/static/chunks/app.js",
        ),
        sameOrigin: true,
        url: new URL("https://reading.example/_next/static/chunks/app.js"),
      }),
    ).toBe(true);
    expect(
      isStaticAssetRequest({
        request: new Request("https://clerk.example/avatar.png"),
        sameOrigin: false,
        url: new URL("https://clerk.example/avatar.png"),
      }),
    ).toBe(false);
  });
});

describe("offline page", () => {
  it("explains the limitation and offers a retry", () => {
    render(<OfflinePageContent />);

    expect(
      screen.getByRole("heading", { name: "You're offline" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/changes cannot be saved while you are offline/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(document.querySelector("form")).toHaveAttribute("action", "/");
  });
});
