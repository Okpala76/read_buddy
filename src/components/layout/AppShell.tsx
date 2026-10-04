"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Sheet } from "@/components/ui/sheet";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavState, setMobileNavState] = useState({
    pathname,
    open: false,
  });
  const mobileNavOpen =
    mobileNavState.pathname === pathname && mobileNavState.open;
  const setMobileNavOpen = (open: boolean) => {
    setMobileNavState({ pathname, open });
  };

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileNavState((state) => ({ ...state, open: false }));
      }
    };

    desktopMedia.addEventListener("change", closeOnDesktop);
    return () => desktopMedia.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <div className="bg-background min-h-svh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Sidebar />
        <div className="min-w-0">
          <Header />
          <main className="mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </Sheet>
  );
}
