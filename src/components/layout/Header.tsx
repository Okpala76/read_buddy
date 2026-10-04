"use client";

import { UserButton } from "@clerk/nextjs";
import { BookOpen, Menu } from "lucide-react";
import Link from "next/link";

import { SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 h-16 w-full border-b backdrop-blur">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <SheetTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-11 items-center justify-center rounded-md lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="size-6" aria-hidden="true" />
            </button>
          </SheetTrigger>

          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <BookOpen className="text-primary size-6" aria-hidden="true" />
            <span className="text-foreground hidden font-semibold sm:block">
              Read Buddy
            </span>
          </Link>

          <span className="text-muted-foreground hidden text-sm lg:block">
            Reading workspace
          </span>
        </div>

        <UserButton />
      </div>
    </header>
  );
}
