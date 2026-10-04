import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl space-y-8 text-center">
        <div className="bg-primary mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
          <BookOpen
            className="text-primary-foreground size-8"
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-accent-foreground mb-2 text-sm font-medium tracking-wide uppercase">
            Read with intention
          </p>
          <h1 className="text-foreground text-4xl font-semibold tracking-tight">
            Read Buddy
          </h1>
          <p className="text-muted-foreground mt-4 text-lg leading-7">
            A calm, focused reading companion. Track books, log progress, and
            build consistent reading habits.
          </p>
        </div>
        <div className="space-y-4">
          <Show when="signed-out">
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <SignInButton mode="redirect">
                <button
                  type="button"
                  className="border-border bg-background text-foreground hover:bg-accent focus-visible:ring-ring inline-flex min-h-12 items-center justify-center rounded-lg border px-6 py-3 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Create account
                  <ArrowRight className="size-5" aria-hidden="true" />
                </button>
              </SignUpButton>
            </div>
          </Show>
          <Show when="signed-in">
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Open workspace
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <UserButton />
            </div>
          </Show>
          <p className="text-muted-foreground text-sm">
            Your books, reading sessions, progress, and reminders in one focused
            workspace.
          </p>
        </div>
      </section>
    </main>
  );
}
