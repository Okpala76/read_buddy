import { BookOpen, RefreshCw } from "lucide-react";

export function OfflinePageContent() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <section className="border-border bg-card w-full max-w-lg rounded-2xl border p-8 text-center shadow-sm sm:p-10">
        <div className="bg-primary mx-auto flex size-16 items-center justify-center rounded-2xl">
          <BookOpen
            className="text-primary-foreground size-8"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-card-foreground mt-6 text-3xl font-semibold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="text-muted-foreground mt-3 leading-7">
          Reconnect to continue using Reading Buddy. Changes cannot be saved
          while you are offline.
        </p>
        <form action="/" method="get">
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mx-auto mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </button>
        </form>
      </section>
    </main>
  );
}
