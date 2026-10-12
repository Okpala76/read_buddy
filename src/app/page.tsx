import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowRight, BookOpen, CheckCircle2, Flame, Target } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-svh px-6 py-10 sm:py-16">
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-5xl items-center">
        <section className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-7 flex items-center gap-3">
              <div className="bg-primary grid size-11 place-items-center rounded-xl">
                <BookOpen
                  className="text-primary-foreground size-5"
                  aria-hidden="true"
                />
              </div>
              <span className="text-foreground font-semibold">Reading Buddy</span>
            </div>

            <p className="text-primary text-sm font-semibold">
              A calmer way to build a reading habit
            </p>
            <h1 className="text-foreground mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Read more consistently, one session at a time.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
              Keep one book in focus, log the pages you read, and see your
              progress and streak without turning reading into another noisy
              productivity system.
            </p>

            <div className="mt-8">
              <Show when="signed-out">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <SignUpButton mode="redirect">
                    <button
                      type="button"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      Start reading with intention
                      <ArrowRight className="size-5" aria-hidden="true" />
                    </button>
                  </SignUpButton>
                  <SignInButton mode="redirect">
                    <button
                      type="button"
                      className="border-border bg-background text-foreground hover:bg-accent focus-visible:ring-ring inline-flex min-h-12 items-center justify-center rounded-xl border px-6 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      Sign in
                    </button>
                  </SignInButton>
                </div>
              </Show>

              <Show when="signed-in">
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Continue reading
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Link>
                  <UserButton />
                </div>
              </Show>
            </div>
          </div>

          <aside className="border-border bg-card rounded-3xl border p-6 shadow-sm sm:p-8">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              The reading loop
            </p>
            <div className="mt-6 space-y-6">
              <div className="flex gap-4">
                <div className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <BookOpen className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">
                    Keep one book in focus
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Know exactly what you are reading now and what is next.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <Target className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">
                    Log what you actually read
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    A quick reading log updates your book and today&apos;s goal.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <Flame className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">
                    See the habit taking shape
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Streaks and progress show consistency without shame or
                    pressure.
                  </p>
                </div>
              </div>

              <div className="border-border flex items-center gap-2 border-t pt-5 text-sm">
                <CheckCircle2
                  className="text-primary size-4"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">
                  No points, leaderboards, or noisy gamification.
                </span>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
