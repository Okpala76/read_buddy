"use client";

import { BookOpen, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isNavigationItemActive, productNavigation } from "./navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-sidebar-border bg-sidebar sticky top-0 hidden h-svh flex-col border-r lg:flex">
      <div className="border-sidebar-border flex h-16 shrink-0 items-center border-b px-6">
        <Link
          href="/dashboard"
          className="text-sidebar-foreground flex items-center gap-2 text-xl font-semibold"
        >
          <BookOpen
            className="text-sidebar-primary size-6"
            aria-hidden="true"
          />
          <span>Read Buddy</span>
        </Link>
      </div>

      <nav
        className="flex-1 space-y-1 overflow-y-auto p-4"
        aria-label="Main navigation"
      >
        {productNavigation.map((item) => {
          const isActive = isNavigationItemActive(pathname, item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="size-5 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border border-t p-4">
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground w-full justify-start gap-3"
          >
            <LogOut className="size-5" aria-hidden="true" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
