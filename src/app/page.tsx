import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
  ArrowRight,
  Bell,
  BookOpen,
  BookOpenText,
  FileText,
  Flame,
  Library,
  Target,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: FileText,
    title: "Your book, your format",
    description:
      "Track a physical book or upload a PDF or EPUB directly. Review its details and start reading.",
  },
  {
    icon: Library,
    title: "Discover free books",
    description:
      "Explore the free-book catalogue, add a title to your library, and open it in ReadOn.",
  },
  {
    icon: BookOpenText,
    title: "Pick up where you stopped",
    description:
      "Resume PDFs by page and EPUBs by reading location. Your bookmark stays separate from confirmed progress.",
  },
  {
    icon: Target,
    title: "Progress that reflects your reading",
    description:
      "Confirm completed pages or EPUB locations. Build a streak without counting navigation as reading.",
  },
  {
    icon: UsersRound,
    title: "Build a habit together",
    description:
      "Connect with reading friends and choose streak buddies. Send encouragement after your first reading session.",
  },
  {
    icon: Bell,
    title: "A little encouragement",
    description:
      "Your notification bell brings together invitations, reading-time reminders, nudges, milestones, and reactions.",
  },
];
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
              <span className="text-foreground font-semibold">ReadOn</span>
            </div>

            <p className="text-primary text-sm font-semibold">
              A calmer way to build a reading habit
            </p>
            <h1 className="text-foreground mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Read more consistently, one session at a time.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
              Read a physical book, upload a PDF or EPUB, or discover your next
              read in the free catalogue. Keep your place, build a streak, and
              share a little encouragement with your reading friends.
            </p>

            <a
              href="#features"
              className="text-primary mt-5 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
            >
              Explore what you can do
            </a>
            <div className="mt-6">
              <Show when="signed-out">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <SignUpButton mode="redirect">
                    <button
                      type="button"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring motion-press inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      Start reading with intention
                      <ArrowRight className="size-5" aria-hidden="true" />
                    </button>
                  </SignUpButton>
                  <SignInButton mode="redirect">
                    <button
                      type="button"
                      className="border-border bg-background text-foreground hover:bg-accent focus-visible:ring-ring motion-press inline-flex min-h-12 items-center justify-center rounded-xl border px-6 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring motion-press inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
                    Confirm what you finished to update your reading history and
                    progress.
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
            </div>
          </aside>
        </section>
      </div>
      <section
        id="features"
        aria-labelledby="features-heading"
        className="border-border mx-auto w-full max-w-5xl scroll-mt-8 border-t pt-12 pb-8 sm:pt-16"
      >
        <div className="max-w-2xl space-y-3">
          <p className="text-primary text-sm font-semibold">
            A home for your reading habit
          </p>
          <h2
            id="features-heading"
            className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            More reading. A little support along the way.
          </h2>
          <p className="text-muted-foreground leading-7">
            Your library, reading progress, and reading friends in one calm
            place. Every feature starts with helping you return to your book.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="border-border bg-card space-y-4 rounded-2xl border p-6"
            >
              <div className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
                <feature.icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-foreground text-lg font-semibold">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-6">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
        <p className="text-muted-foreground mt-7 text-sm">
          PDF pages and EPUB locations stay distinct. Only confirmed sessions
          count toward your reading habit.
        </p>
      </section>
      <footer className="text-muted-foreground border-border mx-auto mt-8 flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 border-t pt-6 text-sm">
        <span>ReadOn · One session at a time.</span>
        <Link
          href="/dashboard"
          className="text-primary inline-flex min-h-11 items-center gap-2 font-medium"
        >
          Open ReadOn
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
