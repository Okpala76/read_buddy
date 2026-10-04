import { SignIn } from "@clerk/nextjs";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-12">
      <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
        <BookOpen className="text-primary size-7" aria-hidden="true" />
        Read Buddy
      </Link>
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </main>
  );
}
