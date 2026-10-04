"use client";

import { SignOutButton } from "@clerk/nextjs";
import { BookOpen, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isNavigationItemActive, productNavigation } from "./navigation";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <SheetContent
      side="left"
      overlayClassName="lg:hidden"
      className="flex w-[min(20rem,85vw)] flex-col p-0 lg:hidden"
    >
      <SheetHeader className="border-border border-b px-5 py-5 text-left">
        <SheetTitle className="flex items-center gap-2">
          <BookOpen className="text-primary size-6" aria-hidden="true" />
          Read Buddy
        </SheetTitle>
        <SheetDescription>Your reading workspace</SheetDescription>
      </SheetHeader>

      <nav
        className="flex flex-1 flex-col space-y-1 overflow-y-auto p-4"
        aria-label="Mobile navigation"
      >
        {productNavigation.map((item) => {
          const isActive = isNavigationItemActive(pathname, item.href);
          return (
            <SheetClose asChild key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="size-6 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            </SheetClose>
          );
        })}
      </nav>

      <Separator />
      <div className="p-4">
        <SignOutButton redirectUrl="/">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground w-full justify-start gap-3"
          >
            <LogOut className="size-5" aria-hidden="true" />
            Sign out
          </Button>
        </SignOutButton>
      </div>
    </SheetContent>
  );
}
