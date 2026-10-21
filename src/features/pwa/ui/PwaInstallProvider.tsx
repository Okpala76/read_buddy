"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getInstallPlatform,
  INSTALL_DISMISSAL_KEY,
  INSTALL_DISMISSAL_MS,
  isStandaloneInstall,
  shouldShowInstallPrompt,
  type InstallPlatform,
} from "@/features/pwa/domain/install-state";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaInstallContextValue {
  installed: boolean;
  platform: InstallPlatform;
  ready: boolean;
  canPrompt: boolean;
  showSuggestion: boolean;
  guideOpen: boolean;
  openGuide: () => void;
  closeGuide: () => void;
  dismissSuggestion: () => void;
  install: () => Promise<void>;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return context;
}

function readDismissal(): number {
  try {
    return Number(window.localStorage.getItem(INSTALL_DISMISSAL_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [dismissedUntil, setDismissedUntil] = useState(
    Number.POSITIVE_INFINITY,
  );
  const [guideOpen, setGuideOpen] = useState(false);

  const refreshInstalled = useCallback(() => {
    const appleStandalone = (navigator as Navigator & { standalone?: boolean })
      .standalone;
    setInstalled(
      isStandaloneInstall(
        window.matchMedia("(display-mode: standalone)").matches,
        appleStandalone,
      ),
    );
  }, []);

  useEffect(() => {
    setPlatform(getInstallPlatform(navigator.userAgent));
    setDismissedUntil(readDismissal());
    refreshInstalled();
    setReady(true);

    const onInstallAvailable = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setGuideOpen(false);
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    displayMode.addEventListener("change", refreshInstalled);
    window.addEventListener("beforeinstallprompt", onInstallAvailable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      displayMode.removeEventListener("change", refreshInstalled);
      window.removeEventListener("beforeinstallprompt", onInstallAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [refreshInstalled]);

  const dismissSuggestion = useCallback(() => {
    const until = Date.now() + INSTALL_DISMISSAL_MS;
    try {
      window.localStorage.setItem(INSTALL_DISMISSAL_KEY, String(until));
    } catch {
      // Storage can be disabled; the current view is still dismissed.
    }
    setDismissedUntil(until);
    setGuideOpen(false);
  }, []);

  const install = useCallback(async () => {
    if (installed) return;
    if (!deferredPrompt) {
      setGuideOpen(true);
      return;
    }
    const event = deferredPrompt;
    setDeferredPrompt(null);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "dismissed") {
        dismissSuggestion();
      }
      // Accepted means the prompt was accepted; appinstalled confirms success.
    } catch {
      setGuideOpen(true);
    }
  }, [deferredPrompt, dismissSuggestion, installed]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      installed,
      platform,
      ready,
      canPrompt: Boolean(deferredPrompt),
      showSuggestion:
        ready &&
        shouldShowInstallPrompt(
          installed,
          platform,
          dismissedUntil,
          Date.now(),
        ),
      guideOpen,
      openGuide: () => setGuideOpen(true),
      closeGuide: () => setGuideOpen(false),
      dismissSuggestion,
      install,
    }),
    [
      installed,
      platform,
      ready,
      deferredPrompt,
      dismissedUntil,
      guideOpen,
      dismissSuggestion,
      install,
    ],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}
