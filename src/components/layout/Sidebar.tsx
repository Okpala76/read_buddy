"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Books", href: "/books", icon: Library },
  { name: "Reading", href: "/reading", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="lg:border-border lg:bg-card hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
      <div className="border-border flex h-16 items-center justify-center border-b">
        <Link
          href="/dashboard"
          className="text-foreground flex items-center gap-2 text-xl font-semibold"
        >
          <BookOpen className="text-primary h-6 w-6" aria-hidden="true" />
          <span>Read Buddy</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-border border-t p-4">
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground w-full justify-start gap-3"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
