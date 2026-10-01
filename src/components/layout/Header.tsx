"use client";

import { BookOpen, LogOut, Menu, User } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative size-10 rounded-full"
              aria-label="Open account menu"
            >
              <Avatar className="size-9">
                {user?.image && <AvatarImage src={user.image} alt="" />}
                <AvatarFallback>
                  {initials || <User className="size-4" aria-hidden="true" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <div className="flex items-center gap-2 p-2">
              <User className="size-4 shrink-0" aria-hidden="true" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {user?.name || "Reader"}
                </span>
                {user?.email && (
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <form action={signOutAction} className="w-full">
              <DropdownMenuItem asChild>
                <button
                  type="submit"
                  className="text-destructive focus:text-destructive w-full"
                >
                  <LogOut className="mr-2 size-4" aria-hidden="true" />
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
