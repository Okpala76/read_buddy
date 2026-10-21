import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { INSTALL_DISMISSAL_KEY } from "@/features/pwa/domain/install-state";
import { InstallAppBanner, InstallAppGuide, InstallAppMenuItem } from "./InstallAppExperience";
import { PwaInstallProvider } from "./PwaInstallProvider";

function setup({
  userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  standalone = false,
}: { userAgent?: string; standalone?: boolean } = {}) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  Object.defineProperty(window.navigator, "userAgent", { configurable: true, value: userAgent });
  Object.defineProperty(window.navigator, "standalone", { configurable: true, value: standalone });
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
    matches: query === "(display-mode: standalone)" ? standalone : false,
    media: query,
    addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => listeners.delete(cb),
  })));
  window.localStorage.removeItem(INSTALL_DISMISSAL_KEY);
}

function renderFlow() {
  return render(
    <PwaInstallProvider>
      <InstallAppBanner />
      <InstallAppMenuItem />
      <InstallAppGuide />
    </PwaInstallProvider>,
  );
}

describe("PWA installation experience", () => {
  beforeEach(() => setup());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.removeItem(INSTALL_DISMISSAL_KEY);
  });

  it("offers manual iOS instructions instead of a non-existent native install prompt", async () => {
    renderFlow();
    fireEvent.click(await screen.findByRole("button", { name: "Install Reading Buddy" }));
    expect(await screen.findByText(/Choose Add to Home Screen/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Got it" })).toBeVisible();
  });

  it("allows browser continuation and preserves a dismissal cooldown", async () => {
    renderFlow();
    fireEvent.click(await screen.findByRole("button", { name: "Continue in browser" }));
    expect(screen.queryByRole("button", { name: "Install Reading Buddy" })).not.toBeInTheDocument();
    expect(Number(window.localStorage.getItem(INSTALL_DISMISSAL_KEY))).toBeGreaterThan(Date.now());
    expect(screen.getByRole("button", { name: "Install app" })).toBeVisible();
  });

  it("never suggests installation in standalone mode", async () => {
    cleanup();
    setup({ standalone: true });
    renderFlow();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Install app" })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Install Reading Buddy" })).not.toBeInTheDocument();
  });

  it("uses native beforeinstallprompt where available", async () => {
    cleanup();
    setup({
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
    });
    renderFlow();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted"; platform: string }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
    fireEvent(window, event);
    fireEvent.click(await screen.findByRole("button", { name: "Install Reading Buddy" }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  });
});
