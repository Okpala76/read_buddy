import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <section className="border-border bg-card w-full max-w-md space-y-6 rounded-2xl border p-8 text-center shadow-sm">
        <BookOpen className="text-primary mx-auto size-10" aria-hidden="true" />
        <div>
          <h1 className="text-foreground text-2xl font-semibold">
            Sign-in did not complete
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Please return to sign in and try again.
          </p>
        </div>
        <Link
          href="/auth/signin"
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
