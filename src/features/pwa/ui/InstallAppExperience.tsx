"use client";

import { Download, Share2, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOptionalPwaInstall, usePwaInstall } from "./PwaInstallProvider";

export function InstallAppBanner() {
  const { showSuggestion, installed, install, dismissSuggestion } =
    usePwaInstall();
  if (!showSuggestion || installed) return null;

  return (
    <aside
      aria-label="Install Reading Buddy"
      className="border-primary/20 bg-primary/5 relative mb-6 rounded-2xl border p-5 lg:hidden"
    >
      <button
        type="button"
        onClick={dismissSuggestion}
        aria-label="Dismiss install suggestion"
        className="text-muted-foreground hover:text-foreground absolute top-2 right-2 flex size-10 items-center justify-center rounded-md"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
      <div className="flex items-start gap-3 pr-9">
        <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
          <Smartphone className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-foreground text-lg font-semibold">
            Take Reading Buddy with you
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Add Reading Buddy to your Home Screen for quick access. Then connect
            notifications to receive reading reminders on supported devices.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void install()}
          className="min-h-11"
        >
          <Download className="size-4" aria-hidden="true" />
          Install Reading Buddy
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={dismissSuggestion}
          className="min-h-11"
        >
          Continue in browser
        </Button>
      </div>
    </aside>
  );
}

export function InstallAppMenuItem({ onSelect }: { onSelect?: () => void }) {
  const state = useOptionalPwaInstall();
  if (!state || !state.ready || state.installed) return null;
  const { install } = state;
  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.();
        void install();
      }}
      className="text-muted-foreground hover:bg-accent hover:text-foreground flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium"
    >
      <Download className="size-5 shrink-0" aria-hidden="true" />
      Install app
    </button>
  );
}

export function InstallAppGuide() {
  const { guideOpen, closeGuide, platform, installed } = usePwaInstall();
  return (
    <Sheet
      open={guideOpen && !installed}
      onOpenChange={(open) => !open && closeGuide()}
    >
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-0 sm:w-[28rem] sm:rounded-t-2xl"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Install Reading Buddy</SheetTitle>
          <SheetDescription>
            Add the app to your Home Screen, then open it there to set up
            reminders.
          </SheetDescription>
        </SheetHeader>
        <div className="text-foreground mt-6 space-y-4 text-sm">
          {platform === "ios-safari" ? (
            <ol className="list-decimal space-y-3 pl-5">
              <li>
                Tap the <Share2 className="inline size-4" aria-label="Share" />{" "}
                Share button in Safari.
              </li>
              <li>
                Choose <strong>Add to Home Screen</strong> (you may need to
                scroll).
              </li>
              <li>
                Tap <strong>Add</strong>, then open Reading Buddy from your Home
                Screen.
              </li>
            </ol>
          ) : platform === "ios-other" ? (
            <div className="space-y-3">
              <p>
                Use your browser’s Share menu and look for{" "}
                <strong>Add to Home Screen</strong>.
              </p>
              <p>
                If that option is missing, open Reading Buddy in Safari and use{" "}
                <strong>Share → Add to Home Screen</strong>.
              </p>
            </div>
          ) : platform === "android" ? (
            <ol className="list-decimal space-y-3 pl-5">
              <li>
                Open your browser menu (usually <strong>⋮</strong>).
              </li>
              <li>
                Choose <strong>Install app</strong> or{" "}
                <strong>Add to Home screen</strong>.
              </li>
              <li>Confirm, then launch Reading Buddy from your Home Screen.</li>
            </ol>
          ) : (
            <p>
              Open your browser’s menu and look for <strong>Install app</strong>{" "}
              or <strong>Add to Home Screen</strong>. Availability varies by
              browser.
            </p>
          )}
          <p className="text-muted-foreground bg-muted rounded-lg p-3">
            Installation does not enable notifications automatically. You’ll
            enable them separately from Reading Buddy after installation.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          onClick={closeGuide}
        >
          Got it
        </Button>
      </SheetContent>
    </Sheet>
  );
}
